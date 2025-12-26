// src/modules/services/service.controller.ts
import { Request, Response } from "express";
import {
  listActiveServices,
  getServiceById,
  listServicesByProvider,
  createService,
  updateService,
  deactivateService,
  countActiveServices,
} from "./service.repository";
import { CreateServiceInput, UpdateServiceInput } from "./service.types";
import { AuthPayload } from "../../middleware/auth.middleware";
import { uploadToCloudinary } from "../../utils/cloudinary-upload";

// 🔹 Image limit for each service
const MAX_SERVICE_IMAGES = 5;

// src/modules/services/service.controller.ts

export const listServicesHandler = async (req: Request, res: Response) => {
  try {
    const { categoryId, providerId, search, limit, offset } = req.query;

    const params = {
      categoryId: categoryId as string | undefined,
      providerId: providerId as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    // Get services and total count in parallel
    const [services, total] = await Promise.all([
      listActiveServices(params),
      countActiveServices(params),
    ]);

    return res.json({
      services,
      total,
      limit: params.limit,
      offset: params.offset,
      hasMore: params.offset + services.length < total,
    });
  } catch (error) {
    console.error("listServicesHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getServiceHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await getServiceById(id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(service);
  } catch (error) {
    console.error("getServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const listMyServicesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const services = await listServicesByProvider(user.userId);
    return res.json(services);
  } catch (error) {
    console.error("listMyServicesHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Debug logging
    console.log('=== CREATE SERVICE REQUEST ===');
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request body:', req.body);
    console.log('Request files:', req.files ? (req.files as Express.Multer.File[]).length : 0, 'files');

    // Get text fields from FormData (req.body contains form fields when using multer)
    const { 
      category_id, 
      title, 
      description, 
      base_price, 
      duration_minutes,
      is_active,
      images: existingImagesJson // This might be a JSON string of existing image URLs
    } = req.body;

    console.log('Parsed fields:', {
      category_id,
      title,
      description,
      base_price,
      duration_minutes,
      is_active,
      hasExistingImages: !!existingImagesJson
    });

    // Validate required fields
    if (!category_id || !title || !description || !base_price) {
      return res.status(400).json({
        error: "category_id, title, description, base_price are required",
      });
    }

    // Initialize image array
    let allImages: string[] = [];

    // 🔹 Handle uploaded files from FormData (multer)
    const files = req.files as Express.Multer.File[];
    if (files && files.length > 0) {
      console.log(`Processing ${files.length} uploaded files`);
      
      if (files.length > MAX_SERVICE_IMAGES) {
        return res.status(400).json({
          error: `You can upload up to ${MAX_SERVICE_IMAGES} images per service`,
        });
      }

      try {
        // Upload all images to Cloudinary
        const uploadPromises = files.map(file =>
          uploadToCloudinary(file.buffer, {
            folder: `servio/services/${user.userId}`,
          })
        );

        const uploadResults = await Promise.all(uploadPromises);
        const uploadedImageUrls = uploadResults.map(result => result.secure_url);
        allImages = [...uploadedImageUrls];
        console.log(`Uploaded ${uploadedImageUrls.length} images to Cloudinary`);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ 
          error: "Failed to upload images to Cloudinary" 
        });
      }
    }

    // 🔹 Parse existing images from request body (if provided)
    if (existingImagesJson) {
      try {
        let parsedImages: string[] = [];
        
        // Try to parse as JSON string
        if (typeof existingImagesJson === 'string') {
          parsedImages = JSON.parse(existingImagesJson);
        } else if (Array.isArray(existingImagesJson)) {
          parsedImages = existingImagesJson;
        }
        
        if (Array.isArray(parsedImages)) {
          // Filter out invalid URLs and combine with uploaded images
          const validImages = parsedImages.filter((url: string) => 
            url && typeof url === 'string' && url.startsWith('http')
          );
          allImages = [...allImages, ...validImages];
          console.log(`Combined with ${validImages.length} existing images`);
        }
      } catch (parseError) {
        console.error('Error parsing existing images:', parseError);
        // Continue with just the uploaded images
      }
    }

    // Ensure unique images and enforce limit
    allImages = [...new Set(allImages)].slice(0, MAX_SERVICE_IMAGES);
    console.log(`Final images array (${allImages.length} images):`, allImages);

    // Parse and validate numeric fields
    const basePriceNum = parseFloat(base_price);
    if (isNaN(basePriceNum) || basePriceNum <= 0) {
      return res.status(400).json({ 
        error: "base_price must be a valid positive number" 
      });
    }

    const durationMinutes = duration_minutes ? parseInt(duration_minutes) : undefined;
    
    // Parse boolean field (default to true if not provided)
    let isActive = true;
    if (is_active !== undefined) {
      if (typeof is_active === 'string') {
        isActive = is_active.toLowerCase() === 'true' || is_active === '1';
      } else {
        isActive = Boolean(is_active);
      }
    }

    // Prepare service data
    const serviceData: CreateServiceInput = {
      category_id,
      title,
      description,
      base_price: basePriceNum,
      is_active: isActive,
    };

    // Add optional fields if they exist
    if (durationMinutes) {
      serviceData.duration_minutes = durationMinutes;
    }

    if (allImages.length > 0) {
      serviceData.images = allImages;
    }

    console.log('Creating service with data:', {
      ...serviceData,
      images_count: allImages.length
    });

    const service = await createService(user.userId, serviceData);
    console.log('Service created successfully:', service.id);

    return res.status(201).json(service);
  } catch (error: any) {
    console.error("createServiceHandler error:", error);
    return res.status(500).json({ 
      error: "Server error",
      details: error.message 
    });
  }
};

export const updateServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    
    console.log('=== UPDATE SERVICE REQUEST ===');
    console.log('Service ID:', id);
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request files:', req.files ? (req.files as Express.Multer.File[]).length : 0, 'files');

    const { 
      category_id, 
      title, 
      description, 
      base_price, 
      duration_minutes,
      is_active,
      images: existingImagesJson
    } = req.body;

    // Prepare update data
    const updateData: UpdateServiceInput = {};

    if (category_id !== undefined) updateData.category_id = category_id;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    
    if (base_price !== undefined) {
      const basePriceNum = parseFloat(base_price);
      if (isNaN(basePriceNum) || basePriceNum <= 0) {
        return res.status(400).json({ 
          error: "base_price must be a valid positive number" 
        });
      }
      updateData.base_price = basePriceNum;
    }
    
    if (duration_minutes !== undefined) {
      updateData.duration_minutes = duration_minutes ? parseInt(duration_minutes) : null;
    }
    
    if (is_active !== undefined) {
      if (typeof is_active === 'string') {
        updateData.is_active = is_active.toLowerCase() === 'true' || is_active === '1';
      } else {
        updateData.is_active = Boolean(is_active);
      }
    }

    // Handle image uploads
    const files = req.files as Express.Multer.File[];
    let newImageUrls: string[] = [];
    
    if (files && files.length > 0) {
      try {
        const uploadPromises = files.map(file =>
          uploadToCloudinary(file.buffer, {
            folder: `servio/services/${user.userId}`,
          })
        );
        
        const uploadResults = await Promise.all(uploadPromises);
        newImageUrls = uploadResults.map(result => result.secure_url);
        console.log(`Uploaded ${newImageUrls.length} new images`);
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError);
        return res.status(500).json({ 
          error: "Failed to upload images to Cloudinary" 
        });
      }
    }

    // Handle existing images
    let existingImagesArray: string[] = [];
    if (existingImagesJson) {
      try {
        if (typeof existingImagesJson === 'string') {
          existingImagesArray = JSON.parse(existingImagesJson);
        } else if (Array.isArray(existingImagesJson)) {
          existingImagesArray = existingImagesJson;
        }
        
        if (Array.isArray(existingImagesArray)) {
          // Filter valid URLs
          existingImagesArray = existingImagesArray.filter((url: string) => 
            url && typeof url === 'string' && url.startsWith('http')
          );
          console.log(`Parsed ${existingImagesArray.length} existing images`);
        }
      } catch (parseError) {
        console.error('Error parsing existing images:', parseError);
        existingImagesArray = [];
      }
    }

    // Combine and deduplicate all images
    const allImages = [...existingImagesArray, ...newImageUrls];
    if (allImages.length > 0 || existingImagesJson !== undefined) {
      updateData.images = [...new Set(allImages)].slice(0, MAX_SERVICE_IMAGES);
      console.log(`Final images for update (${updateData.images?.length}):`, updateData.images);
    }

    const updated = await updateService(id, updateData);
    if (!updated) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(updated);
  } catch (error: any) {
    console.error("updateServiceHandler error:", error);
    return res.status(500).json({ 
      error: "Server error",
      details: error.message 
    });
  }
};

export const deleteServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const updated = await deactivateService(id);
    if (!updated) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json({ message: "Service deactivated" });
  } catch (error) {
    console.error("deleteServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};