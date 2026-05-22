import { RevenueActionSeverity } from '../revenue-action-severity.enum';
import { RevenueActionType } from '../revenue-action-type.enum';

export class RevenueActionResponseDto {
  key!: string;
  severity!: RevenueActionSeverity;
  type!: RevenueActionType;
  title!: string;
  description!: string;
  entityType!: string;
  entityId!: number;
  suggestedAction!: string;
  amount?: number;
  currency?: string;
  createdFromRule!: string;
  metadata?: Record<string, unknown>;
}
