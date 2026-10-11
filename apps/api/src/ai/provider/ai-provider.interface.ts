import {
  AiProviderGenerateOptions,
  AiProviderGenerateResult,
} from '@liftmate/shared';

export const AI_PROVIDER = Symbol('AI_PROVIDER');

export interface AiProvider {
  generate(options: AiProviderGenerateOptions): Promise<AiProviderGenerateResult>;
}
