import type { FeatureGroupType, FeatureItemType } from '../entities/Feature';
import type { TallyFeaturesType } from '../entities/TallyFeatures';

export interface FeatureManagementAPI {
  tallyFeatures: {
    get: (company_id: number) => Promise<{ success: boolean; features: TallyFeaturesType }>;
    update: (data: Partial<TallyFeaturesType>) => Promise<{ success: boolean; features: TallyFeaturesType }>;
    reset: (company_id: number) => Promise<{ success: boolean; features: TallyFeaturesType }>;
  };

  companyCreationSuccess: {
    get: (company_id: number) => Promise<{ success: boolean; record: { id: number; company_id: number; success_screen_shown: number; feature_setup_completed: number } }>;
    update: (data: { company_id: number; [key: string]: unknown }) => Promise<{ success: boolean; record: { id: number } }>;
  };

  featureGroup: {
    getAll: () => Promise<{ success: boolean; featureGroups: FeatureGroupType[] }>;
    getById: (id: number) => Promise<{ success: boolean; group: FeatureGroupType }>;
  };

  featureItem: {
    getAll: () => Promise<{ success: boolean; featureItems: FeatureItemType[] }>;
    getById: (id: number) => Promise<{ success: boolean; item: FeatureItemType }>;
    getByGroup: (group_id: number) => Promise<{ success: boolean; featureItems: FeatureItemType[] }>;
  };

  companyFeatureValues: {
    get: (company_id: number) => Promise<{ success: boolean; values: { id: number; company_id: number; feature_item_id: number; value_boolean: number; is_enabled: number }[] }>;
    getByGroup: (company_id: number, group_id: number) => Promise<{ success: boolean; values: { id: number; feature_item_id: number; value_boolean: number; is_enabled: number }[] }>;
    update: (data: { company_id: number; feature_item_id: number; value_boolean?: number; is_enabled?: number }) => Promise<{ success: boolean; value: { id: number } }>;
    updateBulk: (company_id: number, values: { feature_item_id: number; value_boolean?: number; is_enabled?: number }[]) => Promise<{ success: boolean; updated: { id: number }[] }>;
  };
}
