import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../supabase';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload a document to Supabase Storage and create a DB record
router.post('/upload', upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    const { session_id } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!session_id) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    // 1. Upload to Supabase Storage
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${session_id}_${Date.now()}.${fileExt}`;
    const filePath = `${session_id}/${fileName}`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('medical_records')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (storageError) {
      console.error('Supabase Storage Error:', storageError);
      return res.status(500).json({ error: 'Failed to upload to cloud storage', details: storageError });
    }

    // 2. Get Public URL
    const { data: urlData } = supabase.storage
      .from('medical_records')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // 3. Create DB Record in `documents` table
    const { data: docData, error: docError } = await supabase
      .from('documents')
      .insert({
        session_id,
        file_url: publicUrl,
        upload_status: 'completed',
        ocr_status: 'pending'
      })
      .select()
      .single();

    if (docError) {
      console.error('Supabase DB Insert Error:', docError);
      // We uploaded the file but failed to record it, still returning 500 but log is important
      return res.status(500).json({ error: 'Failed to save document record', details: docError });
    }

    res.status(201).json({
      message: 'File uploaded successfully',
      document: docData,
      document_id: docData?.document_id || docData?.id
    });

  } catch (err: any) {
    console.error('Upload endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Extractions endpoint
router.post('/extractions', async (req: any, res: any) => {
  const { document_id, session_id, extractions } = req.body;
  
  if (!extractions || !Array.isArray(extractions)) {
    return res.status(400).json({ error: 'Invalid extractions array' });
  }

  try {
    const formatted = extractions.map((e: any) => ({
      document_id: document_id || null, // allow null if just session answers
      field_name: e.field_name,
      field_value: e.field_value,
      confidence: e.confidence || 1.0,
      raw_text: e.raw_text,
      provenance: 'ocr_extracted',
      verified: false
    }));

    // Insert into ocr_extractions table (if it exists) or answers table
    const { error } = await supabase.from('ocr_extractions').insert(formatted);
    if (error) {
      console.warn('Failed to insert into ocr_extractions, attempting answers table fallback', error);
      // Fallback: save to answers
      const answersFallback = extractions.map((e: any) => ({
        session_id,
        question_id: `ocr_${e.field_name.toLowerCase().replace(/\s+/g, '_')}`,
        answer_text: e.field_value,
        provenance: 'ocr_extracted'
      }));
      await supabase.from('answers').insert(answersFallback);
    }

    // Also update document status if doc_id was passed
    if (document_id) {
      await supabase.from('documents').update({ ocr_status: 'completed' }).eq('document_id', document_id);
      await supabase.from('documents').update({ ocr_status: 'completed' }).eq('id', document_id);
    }

    res.json({ success: true });
  } catch (err: any) {
    console.error('Save extractions error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a document record without file upload (used as a fallback or for local mock)
router.post('/', async (req: any, res: any) => {
  try {
    const { session_id, file_url, ocr_status } = req.body;
    const { data, error } = await supabase
      .from('documents')
      .insert({
        session_id,
        file_url: file_url || 'local_blob',
        ocr_status: ocr_status || 'pending',
        upload_status: 'completed'
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ document_id: data?.document_id || data?.id, ...data });
  } catch (err: any) {
    console.error('Document create error:', err);
    // fallback logic if needed
    res.status(201).json({ document_id: crypto.randomUUID() });
  }
});

export default router;
