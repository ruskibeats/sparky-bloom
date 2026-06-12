import t1dOnboardingRepository from '../models/t1dOnboardingRepository.js';
import t1dProfileRepository from '../models/t1dProfileRepository.js';
import { log } from '../config/logging.js';
import type { SaveT1dOnboardingBody } from '../schemas/t1dOnboarding.zod.js';
import type { T1dOnboardingData } from '../models/t1dOnboardingRepository.js';

async function saveT1dOnboarding(
  userId: string,
  data: SaveT1dOnboardingBody
): Promise<T1dOnboardingData> {
  try {
    const profile = await t1dProfileRepository.getOrCreateProfileForSparkyUser(
      userId,
      userId
    );

    const saved = await t1dOnboardingRepository.saveT1dOnboardingData(
      profile.id,
      userId,
      data
    );

    log('info', `Saved T1D onboarding data for user: ${userId}`);
    return saved;
  } catch (error) {
    log('error', `Error saving T1D onboarding data for user ${userId}:`, error);
    throw new Error('Failed to save T1D onboarding data.', { cause: error });
  }
}

async function getT1dOnboarding(userId: string): Promise<T1dOnboardingData | null> {
  try {
    const profiles = await t1dProfileRepository.getProfilesForSparkyUser(userId);
    if (profiles.length === 0) {
      return null;
    }

    return await t1dOnboardingRepository.getT1dOnboardingByProfileId(
      profiles[0].id,
      userId
    );
  } catch (error) {
    log('error', `Error fetching T1D onboarding data for user ${userId}:`, error);
    throw new Error('Failed to fetch T1D onboarding data.', { cause: error });
  }
}

async function checkT1dOnboardingStatus(userId: string): Promise<{ t1dOnboardingComplete: boolean }> {
  try {
    const isComplete = await t1dOnboardingRepository.isT1dOnboardingComplete(userId);
    return { t1dOnboardingComplete: isComplete };
  } catch (error) {
    log('error', `Error checking T1D onboarding status for user ${userId}:`, error);
    return { t1dOnboardingComplete: false };
  }
}

export { saveT1dOnboarding };
export { getT1dOnboarding };
export { checkT1dOnboardingStatus };
export default {
  saveT1dOnboarding,
  getT1dOnboarding,
  checkT1dOnboardingStatus,
};
