import { IsInt, IsPositive } from 'class-validator';

export class AssignEditorDto {
  @IsInt()
  @IsPositive()
  editorUserId: number;
}
