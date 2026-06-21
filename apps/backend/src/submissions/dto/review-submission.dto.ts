import {
  IsIn,
  IsString,
  IsNotEmpty,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class ReviewSubmissionDto {
  @IsIn(['APPROVED', 'REVISION_REQUIRED'])
  @IsNotEmpty()
  decision!: 'APPROVED' | 'REVISION_REQUIRED';

  // Feedback is mandatory when requesting a revision (S2-F28) — the FE enforced it
  // but the server previously accepted REVISION_REQUIRED with a NULL comment, so the
  // requirement was bypassable via the API. The single ValidateIf gate runs the
  // validators below ONLY for REVISION_REQUIRED; for APPROVED they're skipped, so
  // feedback stays effectively optional there.
  @ValidateIf((o: ReviewSubmissionDto) => o.decision === 'REVISION_REQUIRED')
  @IsString()
  @IsNotEmpty({ message: 'feedback is required when requesting a revision' })
  @MaxLength(5000)
  feedback?: string;
}
