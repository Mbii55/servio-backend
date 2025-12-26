// src/modules/search/search.controller.ts
import { Request, Response } from "express";
import { listActiveServices, countActiveServices } from "../services/service.repository";
import { searchProviders, countSearchProviders } from "../users/user.repository";

export const searchAllHandler = async (req: Request, res: Response) => {
  try {
    const { query, categoryId, limit, offset } = req.query;

    const searchParams = {
      search: query as string | undefined,
      categoryId: categoryId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : 20,
      offset: offset ? parseInt(offset as string, 10) : 0,
    };

    const providerParams = {
      query: query as string | undefined,
      limit: searchParams.limit,
      offset: searchParams.offset,
    };

    // Search both services and providers in parallel
    const [services, serviceTotal, providers, providerTotal] = await Promise.all([
      listActiveServices(searchParams),
      countActiveServices(searchParams),
      searchProviders(providerParams),
      countSearchProviders(providerParams),
    ]);

    return res.json({
      services: {
        items: services,
        total: serviceTotal,
      },
      providers: {
        items: providers,
        total: providerTotal,
      },
      limit: searchParams.limit,
      offset: searchParams.offset,
    });
  } catch (error) {
    console.error('searchAllHandler error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
};