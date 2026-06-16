import { fetchTransactions } from './api.js';

const SUPABASE_URL = 'https://zrkfgkrnaqyjvgmldyso.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpya2Zna3JuYXF5anZnbWxkeXNvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMjY5NTMsImV4cCI6MjA4NjkwMjk1M30.Oc3XPZnK71UNwUGiDpfvFnZAxbiyPdXCJNQNN4C2wYs';

export const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);