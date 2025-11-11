import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateCustomerDto {
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEmail()
  @MaxLength(190)
  email!: string;
}
