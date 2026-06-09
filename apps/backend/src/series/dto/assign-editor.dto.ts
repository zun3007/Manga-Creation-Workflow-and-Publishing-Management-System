import { IsInt, IsPositive, IsNotEmpty } from 'class-validator';

export class AssignEditorDto {
  @IsInt()
  @IsPositive()
  @IsNotEmpty()
  editorUserId: number;
}
