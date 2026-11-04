import { emptyProfile, profileSchema } from './travel';
export const loadProfile = async () => {
  return { saved: true, profile: emptyProfile };
};

export const saveProfile = async (data: any) => {
  profileSchema.parse(data);
  return { saved: true };
};
