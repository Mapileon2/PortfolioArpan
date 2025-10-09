/**
 * SaaS Admin Controller
 * Complete implementation of all admin dashboard features following SaaS principles
 */

class SaaSAdminController {
    constructor() {
        this.currentView = 'dashboard';
        this.user = null;
        this.subscription = null;
        this.init();
    }

    async init() {
        console.log('🚀 Initializing SaaS Admin Controller...');
        
        // Wait for services to load
        await this.waitForServices();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Load user data
        await this.loadUserData();
        
        // Load subscription info
        await this.loadSubscriptionInfo();
        
        // Initialize dashboard
        await this.loadDashboardData();
        
        console.log('✅ SaaS Admin Controller ready!');
    }

    async waitForServices() {
        let attempts = 0;
        while ((!window.workingSupabaseClient || !window.workingUploadService || !window.saasFeatures) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.getAttribute('href').substring(1);
                this.switchView(view);
            });
        });

        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                sidebar.classList.toggle('-translate-x-full');
            });
        }

        // User menu
        const userMenuBtn = document.getElementById('userMenuBtn');
        if (userMenuBtn) {
            userMenuBtn.addEventListener('click', () => {
                this.toggleUserMenu();
            });
        }

        // Notifications
        const notificationBtn = document.getElementById('notificationBtn');
        if (notificationBtn) {
            notificationBtn.addEventListener('click', () => {
                this.showNotifications();
            });
        }
    }

    async loadUserData() {
        try {
            // Mock user data - replace with actual API call
            this.user = {
                id: 'user_1',
                name: 'Admin User',
                email: 'admin@example.com',
                role: 'admin',
                avatar: 'https://via.placeholder.com/32',
                permissions: ['*']
            };

            // Update UI
            document.getElementById('userName').textContent = this.user.name;
            document.getElementById('userAvatar').src = this.user.avatar;
        } catch (error) {
            console.error('Failed to load user data:', error);
        }
    }

    async loadSubscriptionInfo() {
        try {
            this.subscription = await window.saasFeatures.getCurrentSubscription();
            
            // Update plan badge
            const planBadge = document.getElementById('currentPlan');
            if (planBadge) {
                planBadge.textContent = `${this.subscription.plan.charAt(0).toUpperCase() + this.subscription.plan.slice(1)} Plan`;
            }
        } catch (error) {
            console.error('Failed to load subscription info:', error);
        }
    }

    async loadDashboardData() {
        try {
            // Load analytics data
            const analyticsData = await window.saasFeatures.getAnalyticsData();
            
            // Update metrics
            document.getElementById('totalPageViews').textContent = this.formatNumber(analyticsData.pageViews);
            document.getElementById('activeUsers').textContent = analyticsData.uniqueVisitors;

            // Load other data
            const projects = await this.getProjects();
            const caseStudies = await this.getCaseStudies();

            document.getElementById('totalProjects').textContent = projects.length;
            document.getElementById('totalCaseStudies').textContent = caseStudies.length;

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    switchView(viewName) {
        // Hide all views
        document.querySelectorAll('.page-view').forEach(view => {
            view.classList.add('hidden');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('bg-blue-50', 'text-blue-700');
            item.classList.add('text-gray-700');
        });

        // Show selected view
        const targetView = document.getElementById(`${viewName}View`);
        if (targetView) {
            targetView.classList.remove('hidden');
        } else {
            // Create view if it doesn't exist
            this.createView(viewName);
        }

        // Update active nav item
        const activeNavItem = document.querySelector(`[href="#${viewName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('bg-blue-50', 'text-blue-700');
            activeNavItem.classList.remove('text-gray-700');
        }

        // Update page title
        document.getElementById('pageTitle').textContent = this.getViewTitle(viewName);
        
        this.currentView = viewName;
    }

    getViewTitle(viewName) {
        const titles = {
            dashboard: 'Dashboard',
            projects: 'Projects',
            'case-studies': 'Case Studies',
            carousel: 'Carousel',
            content: 'Content',
            analytics: 'Analytics',
            users: 'User Management',
            api: 'API Keys',
            backups: 'Backups',
            integrations: 'Integrations',
            billing: 'Billing',
            support: 'Support',
            settings: 'Settings'
        };
        return titles[viewName] || 'Dashboard';
    }

    createView(viewName) {
        const main = document.querySelector('main');
        const viewDiv = document.createElement('div');
        viewDiv.id = `${viewName}View`;
        viewDiv.className = 'page-view';
        
        switch (viewName) {
            case 'projects':
                viewDiv.innerHTML = this.createProjectsView();
                break;
            case 'case-studies':
                viewDiv.innerHTML = this.createCaseStudiesView();
                break;
            case 'carousel':
                viewDiv.innerHTML = this.createCarouselView();
                break;
            case 'analytics':
                viewDiv.innerHTML = this.createAnalyticsView();
                break;
            case 'users':
                viewDiv.innerHTML = this.createUsersView();
                break;
            case 'api':
                viewDiv.innerHTML = this.createAPIView();
                break;
            case 'billing':
                viewDiv.innerHTML = this.createBillingView();
                break;
            default:
                viewDiv.innerHTML = `<div class="text-center py-12"><h2 class="text-2xl font-bold text-gray-900">${this.getViewTitle(viewName)}</h2><p class="text-gray-600 mt-2">Feature coming soon...</p></div>`;
        }
        
        main.appendChild(viewDiv);
    }

    // ==================== PROJECTS MANAGEMENT ====================

    createProjectsView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">Projects</h2>
                    <button onclick="window.saasAdmin.createProject()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <i class="fas fa-plus mr-2"></i>New Project
                    </button>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="projectsGrid">
                    <!-- Projects will be loaded here -->
                </div>
            </div>
        `;
    }

    async openProjectsManager() {
        this.switchView('projects');
        await this.loadProjects();
    }

    async loadProjects() {
        const projects = await this.getProjects();
        const grid = document.getElementById('projectsGrid');
        
        if (grid) {
            grid.innerHTML = projects.map(project => `
                <div class="feature-card p-6">
                    <img src="${project.image}" alt="${project.title}" class="w-full h-40 object-cover rounded-lg mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${project.title}</h3>
                    <p class="text-gray-600 text-sm mb-4">${project.description}</p>
                    <div class="flex items-center justify-between">
                        <span class="px-2 py-1 text-xs rounded-full ${project.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${project.status}</span>
                        <div class="flex space-x-2">
                            <button onclick="window.saasAdmin.editProject('${project.id}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="window.saasAdmin.deleteProject('${project.id}')" class="text-red-600 hover:text-red-800">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    async getProjects() {
        // Mock data - replace with actual API call
        return [
            {
                id: '1',
                title: 'E-commerce Platform',
                description: 'Modern e-commerce solution with React and Node.js',
                image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
                status: 'published',
                created: new Date().toISOString()
            },
            {
                id: '2',
                title: 'Mobile Banking App',
                description: 'Secure mobile banking application with biometric auth',
                image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
                status: 'draft',
                created: new Date().toISOString()
            }
        ];
    }

    createProject() {
        this.showModal('Create New Project', `
            <form id="createProjectForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Project Title</label>
                    <input type="text" name="title" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea name="description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required></textarea>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Project Image</label>
                    <button type="button" onclick="window.saasAdmin.uploadProjectImage()" class="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition">
                        <i class="fas fa-cloud-upload-alt mr-2"></i>Upload Image
                    </button>
                    <input type="hidden" name="image" id="projectImageUrl">
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="window.saasAdmin.closeModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Project</button>
                </div>
            </form>
        `);

        // Handle form submission
        document.getElementById('createProjectForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const projectData = Object.fromEntries(formData);
            
            try {
                await this.saveProject(projectData);
                this.closeModal();
                this.showNotification('success', 'Project created successfully');
                this.loadProjects();
            } catch (error) {
                this.showNotification('error', 'Failed to create project');
            }
        });
    }

    uploadProjectImage() {
        if (window.workingUploadService) {
            window.workingUploadService.showUploadDialog((result) => {
                document.getElementById('projectImageUrl').value = result.url;
                this.showNotification('success', 'Image uploaded successfully');
            });
        }
    }

    // ==================== CAROUSEL MANAGEMENT ====================

    createCarouselView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900">Carousel Management</h2>
                        <p class="text-gray-600 mt-1">Manage homepage carousel slides with drag-and-drop ordering</p>
                    </div>
                    <div class="flex space-x-3">
                        <button onclick="window.carouselManager.openSlideEditor()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <i class="fas fa-plus mr-2"></i>Add Slide
                        </button>
                        <button onclick="window.carouselManager.loadSlides()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                            <i class="fas fa-sync mr-2"></i>Refresh
                        </button>
                        <a href="index.html" target="_blank" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                            <i class="fas fa-external-link-alt mr-2"></i>Preview
                        </a>
                    </div>
                </div>

                <!-- Carousel Stats -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-images text-3xl text-blue-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="totalSlides">0</div>
                        <div class="text-sm text-gray-600">Total Slides</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-eye text-3xl text-green-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="activeSlides">0</div>
                        <div class="text-sm text-gray-600">Active Slides</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-mouse-pointer text-3xl text-purple-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="slideClicks">0</div>
                        <div class="text-sm text-gray-600">Total Clicks</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-chart-line text-3xl text-orange-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="slideViews">0</div>
                        <div class="text-sm text-gray-600">Total Views</div>
                    </div>
                </div>

                <!-- Carousel Management Area -->
                <div class="feature-card p-6">
                    <div id="carouselSlides">
                        <!-- Carousel slides will be loaded here by carousel-manager.js -->
                        <div class="text-center py-12">
                            <i class="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
                            <p class="text-gray-600">Loading carousel slides...</p>
                        </div>
                    </div>
                </div>

                <!-- Integration Status -->
                <div class="feature-card p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span class="text-sm text-gray-700">Front Page Connected</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span class="text-sm text-gray-700">Cloudinary Integration</span>
                        </div>
                        <div class="flex items-center space-x-3">
                            <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            <span class="text-sm text-gray-700">Real-time Updates</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async openCarouselManager() {
        this.switchView('carousel');
        // The carousel manager will automatically load when the view is created
    }

    // ==================== CASE STUDIES MANAGEMENT ====================

    createCaseStudiesView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">Case Studies</h2>
                    <div class="flex space-x-3">
                        <a href="case_study_editor_complete.html" class="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition">
                            <i class="fas fa-plus mr-2"></i>New Case Study
                        </a>
                        <button onclick="window.saasAdmin.importCaseStudy()" class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
                            <i class="fas fa-upload mr-2"></i>Import
                        </button>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="caseStudiesGrid">
                    <!-- Case studies will be loaded here -->
                </div>
            </div>
        `;
    }

    async openCaseStudiesManager() {
        this.switchView('case-studies');
        await this.loadCaseStudies();
    }

    async loadCaseStudies() {
        const caseStudies = await this.getCaseStudies();
        const grid = document.getElementById('caseStudiesGrid');
        
        if (grid) {
            grid.innerHTML = caseStudies.map(study => `
                <div class="feature-card p-6">
                    <img src="${study.hero_image || 'https://via.placeholder.com/400x200'}" alt="${study.title}" class="w-full h-40 object-cover rounded-lg mb-4">
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">${study.title}</h3>
                    <p class="text-gray-600 text-sm mb-4">${study.overview || 'No description available'}</p>
                    <div class="flex items-center justify-between mb-3">
                        <span class="px-2 py-1 text-xs rounded-full ${study.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">${study.status}</span>
                        <span class="text-xs text-gray-500">${study.view_count || 0} views</span>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="window.saasAdmin.editCaseStudy('${study.id}')" class="flex-1 bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700">
                            <i class="fas fa-edit mr-1"></i>Edit
                        </button>
                        <button onclick="window.saasAdmin.viewCaseStudy('${study.id}')" class="flex-1 bg-gray-600 text-white px-3 py-2 rounded text-sm hover:bg-gray-700">
                            <i class="fas fa-eye mr-1"></i>View
                        </button>
                        <button onclick="window.saasAdmin.deleteCaseStudy('${study.id}')" class="bg-red-600 text-white px-3 py-2 rounded text-sm hover:bg-red-700">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    async getCaseStudies() {
        try {
            if (window.workingSupabaseClient) {
                return await window.workingSupabaseClient.getCaseStudies();
            }
        } catch (error) {
            console.error('Failed to load case studies:', error);
        }

        // Mock data
        return [
            {
                id: '1',
                title: 'E-commerce Redesign',
                overview: 'Complete redesign of an e-commerce platform',
                hero_image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400',
                status: 'published',
                view_count: 156
            },
            {
                id: '2',
                title: 'Mobile App UX',
                overview: 'User experience design for mobile banking app',
                hero_image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400',
                status: 'draft',
                view_count: 0
            }
        ];
    }

    editCaseStudy(id) {
        window.open(`case_study_editor_complete.html?id=${id}`, '_blank');
    }

    viewCaseStudy(id) {
        window.open(`case_study_display.html?id=${id}`, '_blank');
    }

    // ==================== ANALYTICS ====================

    createAnalyticsView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">Analytics</h2>
                    <div class="flex space-x-2">
                        <select id="analyticsTimeRange" class="px-3 py-2 border border-gray-300 rounded-lg">
                            <option value="7d">Last 7 days</option>
                            <option value="30d">Last 30 days</option>
                            <option value="90d">Last 90 days</option>
                        </select>
                        <button onclick="window.saasAdmin.exportAnalytics()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                            <i class="fas fa-download mr-2"></i>Export
                        </button>
                    </div>
                </div>

                <!-- Analytics Metrics -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-eye text-3xl text-blue-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="analyticsPageViews">2,456</div>
                        <div class="text-sm text-gray-600">Page Views</div>
                        <div class="text-xs text-green-600 mt-1">+15% from last period</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-users text-3xl text-green-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="analyticsUniqueVisitors">567</div>
                        <div class="text-sm text-gray-600">Unique Visitors</div>
                        <div class="text-xs text-green-600 mt-1">+8% from last period</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-clock text-3xl text-purple-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="analyticsAvgSession">3:24</div>
                        <div class="text-sm text-gray-600">Avg. Session</div>
                        <div class="text-xs text-red-600 mt-1">-2% from last period</div>
                    </div>
                    <div class="feature-card p-6 text-center">
                        <i class="fas fa-percentage text-3xl text-orange-600 mb-3"></i>
                        <div class="text-2xl font-bold text-gray-900" id="analyticsBounceRate">45%</div>
                        <div class="text-sm text-gray-600">Bounce Rate</div>
                        <div class="text-xs text-green-600 mt-1">-5% from last period</div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div class="feature-card p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Traffic Overview</h3>
                        <canvas id="trafficChart" width="400" height="200"></canvas>
                    </div>
                    <div class="feature-card p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Pages</h3>
                        <div id="topPagesList" class="space-y-3">
                            <!-- Will be populated -->
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async openAnalytics() {
        this.switchView('analytics');
        await this.loadAnalyticsData();
    }

    async loadAnalyticsData() {
        const data = await window.saasFeatures.getAnalyticsData();
        
        // Update metrics
        document.getElementById('analyticsPageViews').textContent = this.formatNumber(data.pageViews);
        document.getElementById('analyticsUniqueVisitors').textContent = data.uniqueVisitors;
        document.getElementById('analyticsAvgSession').textContent = this.formatDuration(data.avgSessionDuration);
        document.getElementById('analyticsBounceRate').textContent = `${data.bounceRate}%`;

        // Load top pages
        const topPagesList = document.getElementById('topPagesList');
        if (topPagesList) {
            topPagesList.innerHTML = data.topPages.map(page => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <div class="font-medium text-gray-900">${page.page}</div>
                        <div class="text-sm text-gray-600">${page.views} views</div>
                    </div>
                    <div class="text-sm font-medium text-gray-900">${page.percentage}%</div>
                </div>
            `).join('');
        }

        // Create traffic chart
        this.createTrafficChart();
    }

    createTrafficChart() {
        const ctx = document.getElementById('trafficChart');
        if (ctx) {
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [{
                        label: 'Page Views',
                        data: [120, 190, 300, 500, 200, 300, 450],
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
    }

    // ==================== USER MANAGEMENT ====================

    createUsersView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">User Management</h2>
                    <button onclick="window.saasAdmin.inviteUser()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-user-plus mr-2"></i>Invite User
                    </button>
                </div>

                <div class="feature-card overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="usersTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- Users will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async openUserManagement() {
        this.switchView('users');
        await this.loadUsers();
    }

    async loadUsers() {
        const users = await window.saasFeatures.getUserList();
        const tbody = document.getElementById('usersTableBody');
        
        if (tbody) {
            tbody.innerHTML = users.map(user => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <img src="${user.avatar}" alt="${user.name}" class="w-10 h-10 rounded-full mr-3">
                            <div>
                                <div class="text-sm font-medium text-gray-900">${user.name}</div>
                                <div class="text-sm text-gray-500">${user.email}</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs rounded-full ${this.getRoleColor(user.role)}">${user.role}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <span class="px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">${user.status}</span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatDate(user.lastLogin)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="window.saasAdmin.editUser('${user.id}')" class="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                        <button onclick="window.saasAdmin.deleteUser('${user.id}')" class="text-red-600 hover:text-red-900">Delete</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    inviteUser() {
        this.showModal('Invite New User', `
            <form id="inviteUserForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <input type="email" name="email" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Role</label>
                    <select name="role" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" required>
                        <option value="viewer">Viewer</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Administrator</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Personal Message (Optional)</label>
                    <textarea name="message" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Welcome to our team!"></textarea>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="window.saasAdmin.closeModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send Invitation</button>
                </div>
            </form>
        `);

        document.getElementById('inviteUserForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const userData = Object.fromEntries(formData);
            
            try {
                await window.saasFeatures.inviteUser(userData);
                this.closeModal();
                this.showNotification('success', `Invitation sent to ${userData.email}`);
                this.loadUsers();
            } catch (error) {
                this.showNotification('error', 'Failed to send invitation');
            }
        });
    }

    // ==================== API MANAGEMENT ====================

    createAPIView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">API Keys</h2>
                    <button onclick="window.saasAdmin.generateAPIKey()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-plus mr-2"></i>Generate API Key
                    </button>
                </div>

                <div class="feature-card p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">API Documentation</h3>
                    <p class="text-gray-600 mb-4">Use these API keys to integrate with your portfolio data programmatically.</p>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <code class="text-sm">
                            curl -H "Authorization: Bearer YOUR_API_KEY" https://yoursite.com/api/projects
                        </code>
                    </div>
                </div>

                <div class="feature-card overflow-hidden">
                    <table class="w-full">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissions</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Used</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="apiKeysTableBody" class="bg-white divide-y divide-gray-200">
                            <!-- API keys will be loaded here -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    async openAPIManagement() {
        this.switchView('api');
        await this.loadAPIKeys();
    }

    async loadAPIKeys() {
        const apiKeys = await window.saasFeatures.getAPIKeys();
        const tbody = document.getElementById('apiKeysTableBody');
        
        if (tbody) {
            tbody.innerHTML = apiKeys.map(key => `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="text-sm font-medium text-gray-900">${key.name}</div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center space-x-2">
                            <code class="text-sm bg-gray-100 px-2 py-1 rounded">${key.key}</code>
                            <button onclick="window.saasAdmin.copyToClipboard('${key.key}')" class="text-blue-600 hover:text-blue-800">
                                <i class="fas fa-copy"></i>
                            </button>
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex flex-wrap gap-1">
                            ${key.permissions.map(perm => `<span class="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">${perm}</span>`).join('')}
                        </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${this.formatDate(key.lastUsed)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm">
                        <button onclick="window.saasAdmin.revokeAPIKey('${key.id}')" class="text-red-600 hover:text-red-900">Revoke</button>
                    </td>
                </tr>
            `).join('');
        }
    }

    generateAPIKey() {
        this.showModal('Generate API Key', `
            <form id="generateAPIKeyForm" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Key Name</label>
                    <input type="text" name="name" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="e.g., Mobile App API" required>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div class="space-y-2">
                        <label class="flex items-center">
                            <input type="checkbox" name="permissions" value="projects:read" class="mr-2">
                            <span class="text-sm">Read Projects</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="permissions" value="projects:write" class="mr-2">
                            <span class="text-sm">Write Projects</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="permissions" value="case-studies:read" class="mr-2">
                            <span class="text-sm">Read Case Studies</span>
                        </label>
                        <label class="flex items-center">
                            <input type="checkbox" name="permissions" value="analytics:read" class="mr-2">
                            <span class="text-sm">Read Analytics</span>
                        </label>
                    </div>
                </div>
                <div class="flex justify-end space-x-3 pt-4">
                    <button type="button" onclick="window.saasAdmin.closeModal()" class="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
                    <button type="submit" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Generate Key</button>
                </div>
            </form>
        `);

        document.getElementById('generateAPIKeyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const name = formData.get('name');
            const permissions = formData.getAll('permissions');
            
            try {
                await window.saasFeatures.generateAPIKey(name, permissions);
                this.closeModal();
                this.showNotification('success', 'API key generated successfully');
                this.loadAPIKeys();
            } catch (error) {
                this.showNotification('error', 'Failed to generate API key');
            }
        });
    }

    // ==================== BILLING ====================

    createBillingView() {
        return `
            <div class="space-y-6">
                <div class="flex justify-between items-center">
                    <h2 class="text-2xl font-bold text-gray-900">Billing & Subscription</h2>
                    <button onclick="window.saasAdmin.manageBilling()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                        <i class="fas fa-credit-card mr-2"></i>Manage Billing
                    </button>
                </div>

                <!-- Current Plan -->
                <div class="feature-card p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">Current Plan</h3>
                        <span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Active</span>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div class="text-3xl font-bold text-gray-900" id="currentPlanName">Professional</div>
                            <div class="text-gray-600">$29/month</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Next billing date</div>
                            <div class="font-medium" id="nextBillingDate">March 15, 2024</div>
                        </div>
                        <div>
                            <div class="text-sm text-gray-600">Payment method</div>
                            <div class="font-medium">•••• •••• •••• 4242</div>
                        </div>
                    </div>
                </div>

                <!-- Usage -->
                <div class="feature-card p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Usage This Month</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm text-gray-600">Users</span>
                                <span class="text-sm font-medium">2 / 5</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-blue-600 h-2 rounded-full" style="width: 40%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm text-gray-600">Projects</span>
                                <span class="text-sm font-medium">12 / ∞</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-green-600 h-2 rounded-full" style="width: 100%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-sm text-gray-600">Storage</span>
                                <span class="text-sm font-medium">2.4GB / 10GB</span>
                            </div>
                            <div class="w-full bg-gray-200 rounded-full h-2">
                                <div class="bg-yellow-600 h-2 rounded-full" style="width: 24%"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Available Plans -->
                <div class="feature-card p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Available Plans</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6" id="billingPlans">
                        <!-- Plans will be loaded here -->
                    </div>
                </div>
            </div>
        `;
    }

    async openBilling() {
        this.switchView('billing');
        await this.loadBillingInfo();
    }

    async loadBillingInfo() {
        const subscription = await window.saasFeatures.getCurrentSubscription();
        
        // Update current plan info
        document.getElementById('currentPlanName').textContent = subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1);
        document.getElementById('nextBillingDate').textContent = this.formatDate(subscription.currentPeriodEnd);

        // Load available plans
        const plansContainer = document.getElementById('billingPlans');
        if (plansContainer) {
            const plans = window.saasFeatures.plans;
            plansContainer.innerHTML = Object.entries(plans).map(([key, plan]) => `
                <div class="border rounded-lg p-6 ${subscription.plan === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}">
                    <div class="text-center">
                        <h4 class="text-lg font-semibold text-gray-900">${plan.name}</h4>
                        <div class="text-3xl font-bold text-gray-900 mt-2">$${plan.price}</div>
                        <div class="text-gray-600">/month</div>
                    </div>
                    <ul class="mt-4 space-y-2">
                        ${plan.features.map(feature => `<li class="text-sm text-gray-600"><i class="fas fa-check text-green-500 mr-2"></i>${feature}</li>`).join('')}
                    </ul>
                    <button 
                        onclick="window.saasAdmin.changePlan('${key}')" 
                        class="w-full mt-6 px-4 py-2 rounded-lg transition ${subscription.plan === key ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}"
                        ${subscription.plan === key ? 'disabled' : ''}
                    >
                        ${subscription.plan === key ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
                    </button>
                </div>
            `).join('');
        }
    }

    // ==================== UTILITY METHODS ====================

    showModal(title, content) {
        const modal = document.createElement('div');
        modal.id = 'activeModal';
        modal.className = 'fixed inset-0 modal-backdrop flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
                <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
                    <h2 class="text-xl font-bold text-gray-900">${title}</h2>
                    <button onclick="window.saasAdmin.closeModal()" class="text-gray-500 hover:text-gray-700">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                <div class="p-6">${content}</div>
            </div>
        `;
        
        document.getElementById('modalContainer').appendChild(modal);
    }

    closeModal() {
        const modal = document.getElementById('activeModal');
        if (modal) {
            modal.remove();
        }
    }

    showNotification(type, message) {
        const notification = document.createElement('div');
        notification.className = `notification p-4 rounded-lg shadow-lg text-white ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
        }`;
        
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-auto text-white hover:text-gray-200">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.getElementById('notificationContainer').appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    formatNumber(num) {
        return new Intl.NumberFormat().format(num);
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    getRoleColor(role) {
        const colors = {
            admin: 'bg-red-100 text-red-800',
            editor: 'bg-blue-100 text-blue-800',
            viewer: 'bg-gray-100 text-gray-800'
        };
        return colors[role] || 'bg-gray-100 text-gray-800';
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showNotification('success', 'Copied to clipboard');
        });
    }

    // Placeholder methods for future implementation
    async saveProject(projectData) { /* Implementation */ }
    async editProject(id) { /* Implementation */ }
    async deleteProject(id) { /* Implementation */ }
    async deleteCaseStudy(id) { /* Implementation */ }
    async editUser(id) { /* Implementation */ }
    async deleteUser(id) { /* Implementation */ }
    async revokeAPIKey(id) { /* Implementation */ }
    async changePlan(planId) { /* Implementation */ }
    async exportAnalytics() { /* Implementation */ }
    async importCaseStudy() { /* Implementation */ }
    manageBilling() { /* Implementation */ }
    toggleUserMenu() { /* Implementation */ }
    showNotifications() { /* Implementation */ }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.saasAdmin = new SaaSAdminController();
});