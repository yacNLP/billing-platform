import { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  ValidateIf,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

function IsAbsentUnlessStatus(
  status: PaymentStatus,
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isAbsentUnlessStatus',
      target: object.constructor,
      propertyName,
      constraints: [status],
      options: validationOptions,
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const expectedStatus = args.constraints[0] as PaymentStatus;
          const dto = args.object as CreatePaymentDto;

          if (dto.status === expectedStatus) {
            return true;
          }

          return value === undefined || value === null || value === '';
        },
      },
    });
  };
}

export class CreatePaymentDto {
  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  invoiceId!: number;

  @Type((): NumberConstructor => Number)
  @IsInt()
  @IsPositive()
  amount!: number;

  @IsString()
  @Length(3, 3)
  @Matches(/^[A-Z]{3}$/)
  currency!: string;

  @IsEnum(PaymentStatus)
  status!: PaymentStatus;

  @IsAbsentUnlessStatus(PaymentStatus.SUCCESS, {
    message: 'paidAt must be absent unless status is SUCCESS',
  })
  @ValidateIf(
    (o: CreatePaymentDto): boolean => o.status === PaymentStatus.SUCCESS,
  )
  @IsDefined()
  @IsDateString()
  paidAt?: string;

  @IsAbsentUnlessStatus(PaymentStatus.FAILED, {
    message: 'failureReason must be absent unless status is FAILED',
  })
  @ValidateIf(
    (o: CreatePaymentDto): boolean => o.status === PaymentStatus.FAILED,
  )
  @IsDefined()
  @IsString()
  failureReason?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;
}
