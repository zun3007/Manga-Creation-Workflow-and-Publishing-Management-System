import { AnnotationsService } from './annotations.service';

describe('AnnotationsService', () => {
  it('create inserts annotation with all required fields and optional coordinates', async () => {
    const db: any = {
      insert: jest.fn().mockResolvedValue(1),
      queryOne: jest.fn().mockResolvedValue({
        annotation_id: 1,
        target_type: 'PAGE',
        target_id: 8,
        annotation_category: 'VISUAL_ISSUE',
        context: 'fix tone',
        x_coordinate: 10,
        y_coordinate: 20,
        is_resolved: false,
        created_at: '2026-05-31T10:00:00Z',
      }),
    };
    const s = new AnnotationsService(db);
    const r = await s.create(5, {
      targetType: 'PAGE',
      targetId: 8,
      category: 'VISUAL_ISSUE',
      context: 'fix tone',
      x: 10,
      y: 20,
    });
    expect(r.id).toBe(1);
    expect(r.targetType).toBe('PAGE');
    expect(r.targetId).toBe(8);
    expect(r.category).toBe('VISUAL_ISSUE');
    expect(r.context).toBe('fix tone');
    expect(r.x).toBe(10);
    expect(r.y).toBe(20);
    expect(db.insert).toHaveBeenCalledWith(
      expect.stringContaining('Annotation'),
      expect.arrayContaining([
        'PAGE',
        8,
        5,
        'VISUAL_ISSUE',
        'fix tone',
        10,
        20,
      ]),
    );
  });

  it('list returns annotations for a target', async () => {
    const db: any = {
      query: jest.fn().mockResolvedValue([
        {
          id: 1,
          targetType: 'PAGE',
          targetId: 8,
          category: 'VISUAL_ISSUE',
          context: 'fix tone',
          x: 10,
          y: 20,
          isResolved: false,
          createdAt: '2026-05-31T10:00:00Z',
        },
      ]),
    };
    const s = new AnnotationsService(db);
    const r = await s.list('PAGE', 8);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('Annotation'),
      expect.arrayContaining(['PAGE', 8]),
    );
  });
});
