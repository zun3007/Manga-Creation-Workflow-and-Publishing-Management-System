import { AnnotationsService } from './annotations.service';
import { Role } from '@manga/shared';

describe('AnnotationsService', () => {
  it('create inserts annotation after verifying the caller is the active editor', async () => {
    const db: any = {
      insert: jest.fn().mockResolvedValue(1),
      queryOne: jest
        .fn()
        // resolveSeriesId(PAGE, 8) -> series 3
        .mockResolvedValueOnce({ seriesId: 3 })
        // active-editor check -> ok
        .mockResolvedValueOnce({ ok: 1 })
        // findOne(1) -> annotation row
        .mockResolvedValueOnce({
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
      query: jest.fn().mockResolvedValue([]),
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

  it('create is forbidden when the caller is not the active editor of the target', async () => {
    const db: any = {
      insert: jest.fn(),
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ seriesId: 3 }) // resolveSeriesId
        .mockResolvedValueOnce(null), // editor check fails
      query: jest.fn(),
    };
    const s = new AnnotationsService(db);
    await expect(
      s.create(5, {
        targetType: 'PAGE',
        targetId: 8,
        category: 'VISUAL_ISSUE',
        context: 'fix tone',
      }),
    ).rejects.toThrow('không phải biên tập');
    expect(db.insert).not.toHaveBeenCalled();
  });

  it('list returns annotations for a target the caller manages', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ seriesId: 3 }) // resolveSeriesId
        .mockResolvedValueOnce({ ok: 1 }), // active-editor check
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
    const r = await s.list({ id: 5, role: Role.TANTOU_EDITOR }, 'PAGE', 8);
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe(1);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('Annotation'),
      expect.arrayContaining(['PAGE', 8]),
    );
  });

  it('list is forbidden when the caller does not own/manage the target series', async () => {
    const db: any = {
      queryOne: jest
        .fn()
        .mockResolvedValueOnce({ seriesId: 3 }) // resolveSeriesId
        .mockResolvedValueOnce(null), // ownership check fails
      query: jest.fn(),
    };
    const s = new AnnotationsService(db);
    await expect(
      s.list({ id: 5, role: Role.MANGAKA }, 'PAGE', 8),
    ).rejects.toThrow('không có quyền');
    expect(db.query).not.toHaveBeenCalled();
  });
});
