import { createServerSupabaseClient } from '@/shared/api/server';
import { mapRecordToDocument, mapDocumentToRecord, type DocumentRecord } from '../repository';
import { Document } from '../model';

export const documentService = {
    async getDocuments(): Promise<Document[]> {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const { data, error } = await supabase
            .from('documents')
            .select('*')
            .eq('user_id', user.id)
            .order('position', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []).map((record: DocumentRecord) => mapRecordToDocument(record));
    },

    async createDocument(documentData: Partial<Document>): Promise<Document> {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const dbRecord = mapDocumentToRecord(documentData);

        // Set defaults
        if (!dbRecord.status) dbRecord.status = 'writing';
        if (!dbRecord.tags) dbRecord.tags = [];
        if (!dbRecord.position) dbRecord.position = 0;
        if (!dbRecord.logo && documentData.company) {
            dbRecord.logo = documentData.company.charAt(0).toUpperCase();
        }
        dbRecord.is_archived = Boolean(documentData.isArchived);

        const { data, error } = await supabase
            .from('documents')
            .insert([{ user_id: user.id, ...dbRecord }])
            .select()
            .single();

        if (error) throw error;
        return mapRecordToDocument(data as DocumentRecord);
    },

    async deleteDocument(id: string): Promise<boolean> {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const { error } = await supabase
            .from('documents')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    },

    async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            throw new Error('Unauthorized');
        }

        const dbRecord = mapDocumentToRecord(updates);
        dbRecord.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('documents')
            .update(dbRecord)
            .eq('id', id)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;
        return mapRecordToDocument(data as DocumentRecord);
    }
};
