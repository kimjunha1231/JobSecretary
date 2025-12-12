import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { mapRecordToDocument, mapDocumentToRecord, type DocumentRecord } from '../repository';
import { Document } from '../model';

async function createClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                set(name: string, value: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value, ...options });
                    } catch (error) {
                        // The `set` method was called from a Server Component.
                    }
                },
                remove(name: string, options: CookieOptions) {
                    try {
                        cookieStore.set({ name, value: '', ...options });
                    } catch (error) {
                        // The `delete` method was called from a Server Component.
                    }
                },
            },
        }
    );
}

export const documentService = {
    async getDocuments(): Promise<Document[]> {
        const supabase = await createClient();
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
        const supabase = await createClient();
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
        const supabase = await createClient();
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
        const supabase = await createClient();
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
