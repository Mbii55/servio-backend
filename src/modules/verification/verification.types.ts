// src/modules/verification/verification.types.ts

export type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'resubmitted';
export type DocumentType = 'commercial_registration' | 'trade_license' | 'other';

export interface VerificationDocument {
  id: string;
  business_profile_id: string;
  document_type: DocumentType;
  document_url: string;
  document_name: string | null;
  file_size: number | null;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: string | null;
  uploaded_at: string;
  is_verified: boolean;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface VerificationHistory {
  id: string;
  business_profile_id: string;
  previous_status: VerificationStatus | null;
  new_status: VerificationStatus;
  changed_by: string;
  reason: string | null;
  created_at: string;
}

export interface BusinessProfileWithVerification {
  id: string;
  user_id: string;
  business_name: string;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  created_at: string;
  
  // User info
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_display_id: string;
  
  // Documents
  documents: VerificationDocument[];
}

export interface UploadDocumentInput {
  business_profile_id: string;
  document_type: DocumentType;
  document_url: string;
  document_name?: string;
  file_size?: number;
  cloudinary_public_id?: string | null;
  cloudinary_resource_type?: string | null;
}