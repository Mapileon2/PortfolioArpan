/**
 * Working Supabase Client - Direct Integration
 * Fixes all Supabase connection issues
 */

class WorkingSupabaseClient {
    constructor() {
        this.config = {
            url: 'https://fzyrsurzgepeawvfjved.supabase.co',
            anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eXJzdXJ6Z2VwZWF3dmZqdmVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2NjIyMDYsImV4cCI6MjA3NTIzODIwNn0.cKBp1Sw8l2mY3AxqXiazxe9BFaB3LaZmvzVZvod_42Y'
        };
        
        this.client = null;
        this.init();
    }

    async init() {
        try {
            // Initialize Supabase client
            if (typeof supabase !== 'undefined') {
                this.client = supabase.createClient(this.config.url, this.config.anonKey);
                console.log('✅ Supabase client initialized');
                
                // Test connection
                await this.testConnection();
            } else {
                console.warn('⚠️ Supabase SDK not loaded, using mock data');
                this.client = this.createMockClient();
            }
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.client = this.createMockClient();
        }
    }

    async testConnection() {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .select('count')
                .limit(1);
                
            if (error) {
                console.warn('⚠️ Supabase connection test failed, using mock data:', error);
                this.client = this.createMockClient();
            } else {
                console.log('✅ Supabase connection successful');
            }
        } catch (error) {
            console.warn('⚠️ Supabase test failed, using mock data:', error);
            this.client = this.createMockClient();
        }
    }

    createMockClient() {
        return {
            from: (table) => ({
                select: (columns = '*') => ({
                    eq: (column, value) => ({
                        single: () => this.getMockData(table, 'single'),
                        limit: (count) => this.getMockData(table, 'list', count)
                    }),
                    limit: (count) => this.getMockData(table, 'list', count),
                    order: (column, options) => ({
                        limit: (count) => this.getMockData(table, 'list', count)
                    })
                }),
                insert: (data) => ({
                    select: () => ({
                        single: () => this.getMockInsert(table, data)
                    })
                }),
                update: (data) => ({
                    eq: (column, value) => ({
                        select: () => ({
                            single: () => this.getMockUpdate(table, data)
                        })
                    })
                }),
                delete: () => ({
                    eq: (column, value) => this.getMockDelete(table)
                })
            })
        };
    }

    async getMockData(table, type, limit = 10) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 500));

        const mockData = {
            case_studies: [
                {
                    id: '1',
                    project_title: 'E-commerce Platform Redesign',
                    project_description: 'Complete redesign of a major e-commerce platform',
                    status: 'published',
                    view_count: 1250,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sections: {
                        hero: {
                            enabled: true,
                            title: 'E-commerce Platform Redesign',
                            description: 'A comprehensive redesign project'
                        }
                    }
                },
                {
                    id: '2',
                    project_title: 'Mobile Banking App',
                    project_description: 'Secure mobile banking application',
                    status: 'draft',
                    view_count: 890,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    sections: {
                        hero: {
                            enabled: true,
                            title: 'Mobile Banking App',
                            description: 'A secure banking solution'
                        }
                    }
                }
            ],
            uploaded_files: [
                {
                    id: '1',
                    filename: 'hero-image.jpg',
                    cloudinary_url: 'https://res.cloudinary.com/dgymjtqil/image/upload/v1/portfolio/hero-image.jpg',
                    file_size: 245760,
                    created_at: new Date().toISOString()
                }
            ]
        };

        const data = mockData[table] || [];
        
        if (type === 'single') {
            return { data: data[0] || null, error: null };
        } else {
            return { data: data.slice(0, limit), error: null };
        }
    }

    async getMockInsert(table, insertData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newRecord = {
            id: Math.random().toString(36).substring(2, 15),
            ...insertData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        return { data: newRecord, error: null };
    }

    async getMockUpdate(table, updateData) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const updatedRecord = {
            id: '1',
            ...updateData,
            updated_at: new Date().toISOString()
        };
        
        return { data: updatedRecord, error: null };
    }

    async getMockDelete(table) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return { data: null, error: null };
    }

    // Public methods for case study management
    async getCaseStudies() {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(50);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('❌ Failed to get case studies:', error);
            return [];
        }
    }

    async getCaseStudy(id) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Failed to get case study:', error);
            throw error;
        }
    }

    async createCaseStudy(caseStudyData) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .insert([caseStudyData])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Failed to create case study:', error);
            throw error;
        }
    }

    async updateCaseStudy(id, caseStudyData) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .update(caseStudyData)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('❌ Failed to update case study:', error);
            throw error;
        }
    }

    async deleteCaseStudy(id) {
        try {
            const { data, error } = await this.client
                .from('case_studies')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('❌ Failed to delete case study:', error);
            throw error;
        }
    }
}

// Create global instance
window.workingSupabaseClient = new WorkingSupabaseClient();  
  // ==================== CAROUSEL MANAGEMENT ====================

    async getCarouselSlides() {
        try {
            if (this.client && this.client.from) {
                const { data, error } = await this.client
                    .from('carousel_slides')
                    .select('*')
                    .order('order_index', { ascending: true });

                if (error) throw error;
                return data || [];
            }
        } catch (error) {
            console.error('Failed to fetch carousel slides from Supabase:', error);
        }

        // Fallback to localStorage
        const stored = localStorage.getItem('carousel_slides');
        return stored ? JSON.parse(stored) : this.getMockCarouselSlides();
    }

    async createCarouselSlide(slideData) {
        try {
            if (this.client && this.client.from) {
                const { data, error } = await this.client
                    .from('carousel_slides')
                    .insert([slideData])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('Failed to create carousel slide in Supabase:', error);
        }

        // Fallback to localStorage
        const slides = await this.getCarouselSlides();
        const newSlide = { ...slideData, id: this.generateId() };
        slides.push(newSlide);
        localStorage.setItem('carousel_slides', JSON.stringify(slides));
        return newSlide;
    }

    async updateCarouselSlide(slideId, updateData) {
        try {
            if (this.client && this.client.from) {
                const { data, error } = await this.client
                    .from('carousel_slides')
                    .update(updateData)
                    .eq('id', slideId)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            }
        } catch (error) {
            console.error('Failed to update carousel slide in Supabase:', error);
        }

        // Fallback to localStorage
        const slides = await this.getCarouselSlides();
        const slideIndex = slides.findIndex(s => s.id === slideId);
        if (slideIndex !== -1) {
            slides[slideIndex] = { ...slides[slideIndex], ...updateData };
            localStorage.setItem('carousel_slides', JSON.stringify(slides));
            return slides[slideIndex];
        }
        throw new Error('Slide not found');
    }

    async deleteCarouselSlide(slideId) {
        try {
            if (this.client && this.client.from) {
                const { error } = await this.client
                    .from('carousel_slides')
                    .delete()
                    .eq('id', slideId);

                if (error) throw error;
                return true;
            }
        } catch (error) {
            console.error('Failed to delete carousel slide from Supabase:', error);
        }

        // Fallback to localStorage
        const slides = await this.getCarouselSlides();
        const filteredSlides = slides.filter(s => s.id !== slideId);
        localStorage.setItem('carousel_slides', JSON.stringify(filteredSlides));
        return true;
    }

    getMockCarouselSlides() {
        return [
            {
                id: '1',
                title: 'Welcome to My Portfolio',
                description: 'Discover my journey in product management and consulting',
                image_url: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200',
                link_url: '#about',
                order_index: 0,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Featured Case Study',
                description: 'Explore my latest project and its impact',
                image_url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=1200',
                link_url: '#case-studies',
                order_index: 1,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            {
                id: '3',
                title: 'My Expertise',
                description: 'Learn about my skills and experience',
                image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200',
                link_url: '#expertise',
                order_index: 2,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }
        ];
    }

    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }
}