import { PartialType } from '@nestjs/mapped-types';
import { CreateCustomerDto } from './create-customer.dto';

// makes all fields optional for PATCH
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
