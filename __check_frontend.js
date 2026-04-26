
        const STORAGE_KEYS = {
            members: 'members',
            incomes: 'incomes',
            expenses: 'expenses',
            borrowings: 'borrowings',
            contributions: 'contributions',
            activityCategories: 'activityCategories',
            activities: 'activities',
            darkMode: 'darkMode',
            appSettings: 'appSettings',
            sessionToken: 'sessionToken'
        };

        const POSITION_OPTIONS = ['Member', 'Chairperson', 'Chairperson Assistant', 'Vice Chairperson', 'Vice Chairperson Assistant', 'Secretary', 'Secretary Assistant', 'Finance', 'Finance Assistant', 'Development Coordinator', 'Development Coordinator Assistant', 'Communication & Outreach', 'Communication & Outreach Assistant', 'Spiritual Advisor / Elder'];
        const DEFAULT_ACTIVITY_CATEGORIES = ['Event', 'Announcement', 'Program'];
        const ACTIVITY_STATUS_OPTIONS = ['Scheduled', 'Ongoing', 'Completed'];
        const GENERAL_COLLECTION_LABEL = 'General Collection';
        const INCOME_TYPES = ['COG Contribution', 'Offering', 'Tithe', 'Other Income'];
        const USER_ROLES = ['Admin', 'Finance', 'Secretary', 'Viewer'];
        const SECTION_ACCESS = {
            dashboard: USER_ROLES,
            members: ['Admin', 'Secretary'],
            services: ['Admin', 'Secretary'],
            finances: ['Admin', 'Finance'],
            reports: USER_ROLES,
            settings: ['Admin']
        };
        const DEFAULT_ACTIVITIES = [
            { category: 'Event', title: 'Outreach Program', date: '2026-04-10', time: '10:00', leader: 'Evangelism Team', location: 'Community Center', description: 'Community outreach visit with prayer, support, and follow-up conversations.', status: 'Scheduled', featured: true },
            { category: 'Announcement', title: 'Sunday Service Reminder', date: '', time: '', leader: 'Office Team', location: 'Main Sanctuary', description: 'Reminder for the upcoming Sunday gathering and choir preparation time.', status: 'Ongoing', featured: false },
            { category: 'Program', title: 'Youth Special Program', date: '2026-04-15', time: '15:00', leader: 'Youth Ministry', location: 'Youth Hall', description: 'Special youth-led worship and teaching session with testimony sharing.', status: 'Scheduled', featured: true }
        ];
        const DEFAULT_APP_SETTINGS = {
            organizationName: 'Addis Ababa COG Management System',
            churchName: 'Church of God Addis Ababa',
            locale: 'en-ET',
            adminUsername: 'admin',
            adminPassword: '1234',
            theme: 'light',
            fontScale: 100,
            reducedMotion: false,
            lastBackupAt: ''
        };

        function readStorage(key, fallback) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : fallback;
            } catch (error) {
                console.error(`Failed to read ${key}`, error);
                return fallback;
            }
        }

        function normalizeAppSettings(value, fallbackSettings) {
            const source = value || {};
            const fallback = fallbackSettings || DEFAULT_APP_SETTINGS;
            return {
                organizationName: (source.organizationName || fallback.organizationName || DEFAULT_APP_SETTINGS.organizationName).trim() || DEFAULT_APP_SETTINGS.organizationName,
                churchName: (source.churchName || fallback.churchName || DEFAULT_APP_SETTINGS.churchName).trim() || DEFAULT_APP_SETTINGS.churchName,
                locale: source.locale || fallback.locale || DEFAULT_APP_SETTINGS.locale,
                adminUsername: (source.adminUsername || fallback.adminUsername || DEFAULT_APP_SETTINGS.adminUsername).trim() || DEFAULT_APP_SETTINGS.adminUsername,
                adminPassword: source.adminPassword || fallback.adminPassword || DEFAULT_APP_SETTINGS.adminPassword,
                theme: source.theme === 'dark' ? 'dark' : 'light',
                fontScale: Math.min(120, Math.max(90, Number(source.fontScale || fallback.fontScale || DEFAULT_APP_SETTINGS.fontScale))),
                reducedMotion: Boolean(source.reducedMotion),
                lastBackupAt: source.lastBackupAt || ''
            };
        }

        function normalizeMember(value) {
            const source = value || {};
            return {
                name: (source.name || '').trim(),
                phone: source.phone || '',
                email: source.email || '',
                gender: source.gender || '',
                birthday: source.birthday || '',
                address: source.address || '',
                notes: source.notes || '',
                position: source.position || 'Member',
                photo: source.photo || '',
                joinedAt: source.joinedAt || new Date().toISOString().split('T')[0]
            };
        }

        function normalizeIncome(value) {
            const source = value || {};
            let type = String(source.type || '').trim();
            if (type === 'Donation' || type === 'Special Support') type = 'Other Income';
            if (!INCOME_TYPES.includes(type)) type = 'COG Contribution';
            return {
                member: String(source.member || GENERAL_COLLECTION_LABEL).trim() || GENERAL_COLLECTION_LABEL,
                amount: Number(source.amount || 0),
                note: String(source.note || '').trim(),
                type,
                date: source.date || new Date().toISOString().split('T')[0],
                bookRef: String(source.bookRef || '').trim()
            };
        }

        function normalizeExpense(value) {
            const source = value || {};
            return {
                name: String(source.name || '').trim(),
                amount: Number(source.amount || 0),
                date: source.date || new Date().toISOString().split('T')[0]
            };
        }

        function normalizeBorrowing(value) {
            const source = value || {};
            return {
                member: String(source.member || '').trim(),
                amount: Number(source.amount || 0),
                note: String(source.note || '').trim(),
                date: source.date || new Date().toISOString().split('T')[0],
                status: source.status === 'Paid' ? 'Paid' : 'Unpaid'
            };
        }

        function normalizeContribution(value) {
            const source = value || {};
            return {
                member: String(source.member || '').trim(),
                amount: Number(source.amount || 0),
                month: source.month || new Date().toISOString().slice(0, 7)
            };
        }

        function normalizeActivity(value) {
            const source = value || {};
            const category = String(source.category || DEFAULT_ACTIVITY_CATEGORIES[0] || 'Activity').trim() || DEFAULT_ACTIVITY_CATEGORIES[0];
            const status = ACTIVITY_STATUS_OPTIONS.includes(source.status) ? source.status : 'Scheduled';
            return {
                category,
                title: String(source.title || '').trim(),
                date: source.date || '',
                time: source.time || '',
                leader: String(source.leader || '').trim(),
                location: String(source.location || '').trim(),
                description: String(source.description || '').trim(),
                status,
                featured: Boolean(source.featured),
                createdAt: source.createdAt || new Date().toISOString()
            };
        }

        function normalizeActivityCategories(list, activityList) {
            const merged = [...DEFAULT_ACTIVITY_CATEGORIES];
            (Array.isArray(list) ? list : []).forEach((item) => merged.push(item));
            (Array.isArray(activityList) ? activityList : []).forEach((activity) => merged.push(activity.category));
            return merged
                .map((item) => String(item || '').trim())
                .filter(Boolean)
                .filter((item, index, array) => array.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index)
                .sort((a, b) => a.localeCompare(b));
        }

        let members = readStorage(STORAGE_KEYS.members, []).map(normalizeMember);
        let incomes = readStorage(STORAGE_KEYS.incomes, []).map(normalizeIncome);
        let expenses = readStorage(STORAGE_KEYS.expenses, []).map(normalizeExpense);
        let borrowings = readStorage(STORAGE_KEYS.borrowings, []).map(normalizeBorrowing);
        let contributions = readStorage(STORAGE_KEYS.contributions, []).map(normalizeContribution);
        let activities = readStorage(STORAGE_KEYS.activities, DEFAULT_ACTIVITIES).map(normalizeActivity);
        let activityCategories = normalizeActivityCategories(readStorage(STORAGE_KEYS.activityCategories, DEFAULT_ACTIVITY_CATEGORIES), activities);
        let selectedActivityIndex = activities.length ? 0 : null;
        let appSettings = normalizeAppSettings(Object.assign({}, DEFAULT_APP_SETTINGS, { theme: localStorage.getItem(STORAGE_KEYS.darkMode) === 'true' ? 'dark' : DEFAULT_APP_SETTINGS.theme }, readStorage(STORAGE_KEYS.appSettings, {})));
        const API_CONFIG = {
            baseUrl: window.location.protocol === 'file:' ? 'http://127.0.0.1:3000/api' : `${window.location.origin}/api`,
            timeoutMs: 8000
        };
        const appRuntime = {
            apiEnabled: false,
            dataSource: 'Local Browser Storage',
            apiStatus: 'Not connected',
            lastSyncAt: '',
            syncing: false,
            signupAllowed: true
        };
        let authToken = localStorage.getItem(STORAGE_KEYS.sessionToken) || '';
        let currentUser = null;
        let accessUsers = [];
        let auditLogs = [];
        let editingAccessUserId = null;
        let editingMemberIndex = null;
        let pendingMemberPhoto = '';
        let editingActivityIndex = null;
        let loginMode = 'login';
        let serverSyncPromise = null;
        let serverSyncQueued = false;

        function getCurrentRole() {
            return currentUser && currentUser.role ? currentUser.role : '';
        }

        function isAdminUser() {
            return getCurrentRole() === 'Admin';
        }

        function canAccessSection(sectionId) {
            const allowedRoles = SECTION_ACCESS[sectionId] || [];
            return !!currentUser && allowedRoles.includes(getCurrentRole());
        }

        function getRoleClass(role) {
            return `settings-role-${String(role || '').toLowerCase()}`;
        }

        function getUserDisplayName(user) {
            if (!user) return 'Not signed in';
            return user.name ? `${user.name} (@${user.username})` : `@${user.username}`;
        }

        function setAuthState(user, token) {
            currentUser = user || null;
            if (typeof token === 'string') {
                authToken = token;
            }
            if (authToken) {
                localStorage.setItem(STORAGE_KEYS.sessionToken, authToken);
            } else {
                localStorage.removeItem(STORAGE_KEYS.sessionToken);
            }
            renderSidebarAccess();
        }

        function clearAuthState() {
            currentUser = null;
            authToken = '';
            accessUsers = [];
            auditLogs = [];
            editingAccessUserId = null;
            localStorage.removeItem(STORAGE_KEYS.sessionToken);
            if (document.getElementById('accessDisplayName')) {
                document.getElementById('accessDisplayName').value = '';
                document.getElementById('accessUsername').value = '';
                document.getElementById('accessPassword').value = '';
            }
            renderSidebarAccess();
        }

        function renderSidebarAccess() {
            document.querySelectorAll('.sidebar a[data-section]').forEach((link) => {
                const sectionId = link.dataset.section;
                const visible = !!currentUser && canAccessSection(sectionId);
                link.style.display = visible ? 'inline-flex' : 'none';
            });

            const activeSection = document.querySelector('.section.active');
            if (activeSection && activeSection.id && currentUser && !canAccessSection(activeSection.id)) {
                document.getElementById('dashboard').classList.add('active');
                activeSection.classList.remove('active');
            }
        }

        function buildAppStateSnapshot() {
            return {
                members: members.map(normalizeMember),
                incomes: incomes.map(normalizeIncome),
                expenses: expenses.map(normalizeExpense),
                borrowings: borrowings.map(normalizeBorrowing),
                contributions: contributions.map(normalizeContribution),
                activityCategories: normalizeActivityCategories(activityCategories, activities),
                activities: activities.map(normalizeActivity),
                appSettings: normalizeAppSettings(appSettings)
            };
        }

        function applyAppStateSnapshot(state) {
            const snapshot = state || {};
            members = (snapshot.members || []).map(normalizeMember);
            incomes = (snapshot.incomes || []).map(normalizeIncome);
            expenses = (snapshot.expenses || []).map(normalizeExpense);
            borrowings = (snapshot.borrowings || []).map(normalizeBorrowing);
            contributions = (snapshot.contributions || []).map(normalizeContribution);
            activities = (snapshot.activities || DEFAULT_ACTIVITIES).map(normalizeActivity);
            activityCategories = normalizeActivityCategories(snapshot.activityCategories || DEFAULT_ACTIVITY_CATEGORIES, activities);
            appSettings = normalizeAppSettings(snapshot.appSettings || appSettings, appSettings);
            selectedActivityIndex = activities.length ? Math.min(selectedActivityIndex === null ? 0 : selectedActivityIndex, activities.length - 1) : null;
        }

        function hasMeaningfulState(state) {
            const snapshot = state || {};
            const hasRecords = ['members', 'incomes', 'expenses', 'borrowings', 'contributions', 'activities']
                .some((key) => Array.isArray(snapshot[key]) && snapshot[key].length > 0);
            const settingsChanged = JSON.stringify(normalizeAppSettings(snapshot.appSettings || {})) !== JSON.stringify(normalizeAppSettings(DEFAULT_APP_SETTINGS));
            return hasRecords || settingsChanged;
        }

        async function apiRequest(path, options) {
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), API_CONFIG.timeoutMs);
            try {
                const requestHeaders = Object.assign({ 'Content-Type': 'application/json' }, options && options.headers ? options.headers : {});
                if (authToken) {
                    requestHeaders.Authorization = `Bearer ${authToken}`;
                }
                const response = await fetch(API_CONFIG.baseUrl + path, Object.assign({
                    headers: requestHeaders,
                    signal: controller.signal
                }, options || {}));
                const raw = await response.text();
                const payload = raw ? JSON.parse(raw) : {};
                if (!response.ok) {
                    throw new Error(payload.message || `Request failed with status ${response.status}`);
                }
                return payload;
            } finally {
                window.clearTimeout(timeout);
            }
        }

        async function saveStateToServer() {
            const payload = await apiRequest('/state', {
                method: 'PUT',
                body: JSON.stringify(buildAppStateSnapshot())
            });
            appRuntime.lastSyncAt = new Date().toISOString();
            appRuntime.apiStatus = API_CONFIG.baseUrl;
            return payload;
        }

        function queueServerSync() {
            if (!appRuntime.apiEnabled) return;
            serverSyncQueued = true;
            if (serverSyncPromise) return;
            serverSyncPromise = (async function flushServerSync() {
                while (serverSyncQueued) {
                    serverSyncQueued = false;
                    appRuntime.syncing = true;
                    try {
                        await saveStateToServer();
                    } catch (error) {
                        console.error('Server sync failed.', error);
                        if ((error.message || '').toLowerCase().includes('authentication')) {
                            clearAuthState();
                            appRuntime.apiStatus = 'Login required to sync changes';
                            document.getElementById('loginOverlay').style.display = 'flex';
                        } else {
                            appRuntime.apiEnabled = false;
                            appRuntime.dataSource = 'Local Browser Storage';
                            appRuntime.apiStatus = 'Sync failed - fallback to local mode';
                        }
                    } finally {
                        appRuntime.syncing = false;
                    }
                }
                serverSyncPromise = null;
                renderSettings();
            })();
        }

        async function initializeAppData() {
            const localSnapshot = buildAppStateSnapshot();
            try {
                const remotePayload = await apiRequest('/state');
                const remoteState = remotePayload.state || remotePayload;
                appRuntime.apiEnabled = true;
                appRuntime.dataSource = 'Server API + Local Cache';
                appRuntime.apiStatus = API_CONFIG.baseUrl;
                appRuntime.signupAllowed = !!(remotePayload.authMeta ? remotePayload.authMeta.signupAllowed : false);
                if (hasMeaningfulState(remoteState)) {
                    applyAppStateSnapshot(remoteState);
                } else {
                    applyAppStateSnapshot(localSnapshot);
                    if (hasMeaningfulState(localSnapshot)) {
                        await saveStateToServer();
                    }
                }
            } catch (error) {
                console.warn('API unavailable. Continuing with local browser storage.', error);
                appRuntime.apiEnabled = false;
                appRuntime.dataSource = 'Local Browser Storage';
                appRuntime.apiStatus = 'Offline or server not started';
                appRuntime.signupAllowed = canCreateLoginAccess();
                applyAppStateSnapshot(localSnapshot);
            }
        }

        function persistData() {
            localStorage.setItem(STORAGE_KEYS.members, JSON.stringify(members.map(normalizeMember)));
            localStorage.setItem(STORAGE_KEYS.incomes, JSON.stringify(incomes.map(normalizeIncome)));
            localStorage.setItem(STORAGE_KEYS.expenses, JSON.stringify(expenses.map(normalizeExpense)));
            localStorage.setItem(STORAGE_KEYS.borrowings, JSON.stringify(borrowings.map(normalizeBorrowing)));
            localStorage.setItem(STORAGE_KEYS.contributions, JSON.stringify(contributions.map(normalizeContribution)));
            localStorage.setItem(STORAGE_KEYS.activityCategories, JSON.stringify(normalizeActivityCategories(activityCategories, activities)));
            localStorage.setItem(STORAGE_KEYS.activities, JSON.stringify(activities.map(normalizeActivity)));
            queueServerSync();
        }

        function persistAppSettings() {
            appSettings = normalizeAppSettings(appSettings, appSettings);
            localStorage.setItem(STORAGE_KEYS.appSettings, JSON.stringify(appSettings));
            localStorage.setItem(STORAGE_KEYS.darkMode, appSettings.theme === 'dark');
            queueServerSync();
        }

        function canCreateLoginAccess() {
            if (appRuntime.apiEnabled) return !!appRuntime.signupAllowed;
            return !appSettings.adminUsername || (appSettings.adminUsername === DEFAULT_APP_SETTINGS.adminUsername && appSettings.adminPassword === DEFAULT_APP_SETTINGS.adminPassword);
        }
        function setLoginMessage(text, isError) { const element = document.getElementById('loginMessage'); if (!element) return; element.textContent = text || ''; element.classList.toggle('error', !!isError); }
        function toggleLoginPasswordVisibility(inputId, trigger) { const field = document.getElementById(inputId); if (!field) return; const reveal = field.type === 'password'; field.type = reveal ? 'text' : 'password'; if (trigger) { trigger.innerHTML = `<i class="fa ${reveal ? 'fa-eye-slash' : 'fa-eye'}"></i>`; } }
        function resetLoginVisibilityButtons() { document.querySelectorAll('.login-visibility-btn').forEach((button) => { button.innerHTML = '<i class="fa fa-eye"></i>'; }); const pass = document.getElementById('loginPass'); const confirm = document.getElementById('loginConfirmPass'); if (pass) pass.type = 'password'; if (confirm) confirm.type = 'password'; }
        function setLoginMode(mode) {
            loginMode = mode === 'signup' ? 'signup' : 'login';
            renderLoginMode();
        }
        function renderLoginMode() {
            const isSignup = loginMode === 'signup';
            const signupAllowed = canCreateLoginAccess();
            const confirmWrap = document.getElementById('loginConfirmWrap');
            const loginTab = document.getElementById('loginTabLogin');
            const signupTab = document.getElementById('loginTabSignup');
            const submitBtn = document.getElementById('loginSubmitBtn');
            const heading = document.getElementById('loginHeading');
            const kicker = document.getElementById('loginKicker');
            const meta = document.getElementById('loginMeta');
            const help = document.getElementById('loginHelpText');
            const passField = document.getElementById('loginPass');
            loginTab.classList.toggle('active', !isSignup);
            signupTab.classList.toggle('active', isSignup);
            confirmWrap.classList.toggle('login-hidden', !isSignup);
            heading.textContent = isSignup ? 'Create Access' : 'Welcome Back';
            kicker.textContent = isSignup ? 'Secure This Device' : 'Church of God Local Access';
            meta.textContent = isSignup
                ? (signupAllowed ? 'Create a private admin login for this device while default access is still active.' : 'Signup is locked after initial setup. Login first, then use Settings > Access & Security.')
                : `${appSettings.churchName} | Use your admin account to continue.`;
            help.textContent = isSignup
                ? (signupAllowed ? 'This will replace the default local access on this browser.' : 'Login with current access and manage credentials from Settings.')
                : 'Forgot password? Use your current local admin credentials or initial setup access.';
            submitBtn.textContent = isSignup ? 'Create Access' : 'Login';
            submitBtn.disabled = isSignup && !signupAllowed;
            passField.placeholder = isSignup ? 'Create Password' : 'Password';
            if (!isSignup) { document.getElementById('loginConfirmPass').value = ''; }
            resetLoginVisibilityButtons();
        }
        async function restoreSession() {
            if (!appRuntime.apiEnabled || !authToken) {
                if (!appRuntime.apiEnabled) clearAuthState();
                return;
            }
            try {
                const result = await apiRequest('/auth/session');
                currentUser = result.user || null;
                if (result.appSettings) {
                    appSettings = normalizeAppSettings(result.appSettings, appSettings);
                    persistAppSettings();
                }
            } catch (error) {
                console.warn('Saved session could not be restored.', error);
                clearAuthState();
            }
        }

        async function finishLoginSuccess(payload) {
            if (payload && payload.user) {
                setAuthState(payload.user, payload.token || authToken);
            }
            if (payload && payload.appSettings) {
                appSettings = normalizeAppSettings(payload.appSettings, appSettings);
                persistAppSettings();
            }
            await refreshSecurityData();
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('loginPass').value = '';
            document.getElementById('loginConfirmPass').value = '';
            setLoginMessage('', false);
            resetLoginVisibilityButtons();
            loadData();
        }
        async function login() {
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;
            if (appRuntime.apiEnabled) {
                try {
                    const result = await apiRequest('/auth/login', {
                        method: 'POST',
                        body: JSON.stringify({ username: user, password: pass })
                    });
                    if (result.ok) {
                        await finishLoginSuccess(result);
                        return;
                    }
                } catch (error) {
                    setLoginMessage(error.message || 'Unable to login right now.', true);
                    return;
                }
            }
            if (user === appSettings.adminUsername && pass === appSettings.adminPassword) {
                setAuthState({ id: 'local-admin', name: 'Local Admin', username: appSettings.adminUsername, role: 'Admin', active: true }, '');
                await finishLoginSuccess({ user: currentUser, appSettings });
                return;
            }
            setLoginMessage('Invalid username or password.', true);
        }
        async function signup() {
            if (!canCreateLoginAccess()) return setLoginMessage('Signup is locked. Login and use Settings > Access & Security instead.', true);
            const user = document.getElementById('loginUser').value.trim();
            const pass = document.getElementById('loginPass').value;
            const confirm = document.getElementById('loginConfirmPass').value;
            if (!user) return setLoginMessage('Choose a username.', true);
            if (pass.length < 4) return setLoginMessage('Password should be at least 4 characters.', true);
            if (pass !== confirm) return setLoginMessage('Password confirmation does not match.', true);
            if (appRuntime.apiEnabled) {
                try {
                    const result = await apiRequest('/auth/signup', {
                        method: 'POST',
                        body: JSON.stringify({ username: user, password: pass, name: user })
                    });
                    await finishLoginSuccess(result);
                    setLoginMode('login');
                    return;
                } catch (error) {
                    setLoginMessage(error.message || 'Unable to create initial admin access.', true);
                    return;
                }
            }
            appSettings.adminUsername = user;
            appSettings.adminPassword = pass;
            persistAppSettings();
            applySavedTheme();
            document.getElementById('loginPass').value = '';
            document.getElementById('loginConfirmPass').value = '';
            setLoginMode('login');
            setLoginMessage('Access created. Login with your new credentials.', false);
        }
        function submitLoginMode() { if (loginMode === 'signup') return signup(); return login(); }
        function handleForgotPassword() {
            if (canCreateLoginAccess()) {
                setLoginMessage('Default setup access is still available. You can also use Signup to create your own local login.', false);
            } else if (appRuntime.apiEnabled) {
                setLoginMessage('Password recovery is not automated here yet. An admin can update your account from Settings > Team Access.', true);
            } else {
                setLoginMessage('Password recovery is not available offline. Use current local admin access or manage credentials from Settings after login.', true);
            }
        }
        async function logout() {
            if (appRuntime.apiEnabled && authToken) {
                try {
                    await apiRequest('/auth/logout', { method: 'POST' });
                } catch (error) {
                    console.warn('Logout request could not be completed cleanly.', error);
                }
            }
            clearAuthState();
            document.getElementById('loginUser').value = appSettings.adminUsername;
            document.getElementById('loginPass').value = '';
            document.getElementById('loginConfirmPass').value = '';
            setLoginMode('login');
            setLoginMessage('', false);
            document.getElementById('loginOverlay').style.display = 'flex';
            loadData();
        }
        function toggleDarkMode() { appSettings.theme = appSettings.theme === 'dark' ? 'light' : 'dark'; persistAppSettings(); applySavedTheme(); loadData(); }
        function applySavedTheme() { document.body.classList.toggle('dark-mode', appSettings.theme === 'dark'); document.body.classList.toggle('reduced-motion', !!appSettings.reducedMotion); document.documentElement.style.fontSize = appSettings.fontScale + '%'; document.title = appSettings.organizationName; const loginUser = document.getElementById('loginUser'); if (loginUser && !loginUser.value) { loginUser.value = currentUser && currentUser.username ? currentUser.username : appSettings.adminUsername; } renderLoginMode(); renderSidebarAccess(); }
        function showSection(id) {
            if (!canAccessSection(id)) {
                setSettingsMessage('securitySettingsMessage', 'Your role does not have access to that section.', true);
                return;
            }
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
            loadData();
        }

        function updateMemberPhotoPreview(photo) { const preview = document.getElementById('memberPhotoPreview'); if (!preview) return; preview.innerHTML = photo ? `<img src="${escapeHtml(photo)}" alt="Member Photo">` : '<i class="fa fa-user"></i>'; }
        function isMemberFormVisible() { const wrapper = document.getElementById('memberFormWrapper'); return !!(wrapper && !wrapper.classList.contains('member-form-hidden')); }
        function updateMemberFormToggleButton() { const button = document.getElementById('openMemberFormBtn'); if (!button) return; button.textContent = isMemberFormVisible() ? 'Hide Form' : 'Add Member'; }
        function setMemberFormVisibility(visible) { const wrapper = document.getElementById('memberFormWrapper'); if (!wrapper) return; wrapper.classList.toggle('member-form-hidden', !visible); updateMemberFormToggleButton(); }
        function openMemberForm() { if (isMemberFormVisible()) { hideMemberForm(); return; } resetMemberForm(); setMemberFormVisibility(true); setSettingsMessage('memberToolbarMessage', '', false); document.getElementById('name').focus(); }
        function hideMemberForm() { resetMemberForm(); setMemberFormVisibility(false); }
        function clearMemberPhoto() { pendingMemberPhoto = ''; document.getElementById('memberPhotoInput').value = ''; updateMemberPhotoPreview(''); setSettingsMessage('memberFormMessage', 'Profile image removed.', false); }
        function resetMemberForm() { editingMemberIndex = null; pendingMemberPhoto = ''; document.getElementById('name').value = ''; document.getElementById('phone').value = ''; document.getElementById('memberEmail').value = ''; document.getElementById('memberGender').value = ''; document.getElementById('memberBirthDate').value = ''; document.getElementById('memberJoinedAt').value = new Date().toISOString().split('T')[0]; document.getElementById('memberAddress').value = ''; document.getElementById('position').value = 'Member'; document.getElementById('memberNotes').value = ''; document.getElementById('memberPhotoInput').value = ''; document.getElementById('memberSubmitBtn').textContent = 'Add Member'; document.getElementById('memberFormTitle').textContent = 'New Member Profile'; setSettingsMessage('memberFormMessage', '', false); updateMemberPhotoPreview(''); }
        function handleMemberImageUpload(event) { const file = event.target.files[0]; if (!file) return; if (!file.type.startsWith('image/')) { setSettingsMessage('memberFormMessage', 'Please choose an image file.', true); return; } const reader = new FileReader(); reader.onload = function (loadEvent) { const image = new Image(); image.onload = function () { const maxSize = 320; const scale = Math.min(maxSize / image.width, maxSize / image.height, 1); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale)); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height); pendingMemberPhoto = canvas.toDataURL('image/jpeg', 0.82); updateMemberPhotoPreview(pendingMemberPhoto); setSettingsMessage('memberFormMessage', 'Profile image ready.', false); }; image.src = loadEvent.target.result; }; reader.readAsDataURL(file); }
        function collectMemberFormData() { return normalizeMember({ name: document.getElementById('name').value.trim(), phone: document.getElementById('phone').value.trim(), email: document.getElementById('memberEmail').value.trim(), gender: document.getElementById('memberGender').value, birthday: document.getElementById('memberBirthDate').value, joinedAt: document.getElementById('memberJoinedAt').value || new Date().toISOString().split('T')[0], address: document.getElementById('memberAddress').value.trim(), notes: document.getElementById('memberNotes').value.trim(), position: document.getElementById('position').value, photo: pendingMemberPhoto }); }
        function addMember() { const member = collectMemberFormData(); if (!member.name) return setSettingsMessage('memberFormMessage', 'Full name is required.', true); const successMessage = editingMemberIndex !== null ? 'Member profile updated.' : 'Member profile added.'; if (editingMemberIndex !== null) { members[editingMemberIndex] = member; } else { members.push(member); } members = members.map(normalizeMember).sort((a, b) => a.name.localeCompare(b.name)); persistData(); resetMemberForm(); setMemberFormVisibility(false); loadData(); setSettingsMessage('memberToolbarMessage', successMessage, false); }
        function editMember(i) { const member = normalizeMember(members[i]); editingMemberIndex = i; pendingMemberPhoto = member.photo || ''; document.getElementById('name').value = member.name; document.getElementById('phone').value = member.phone; document.getElementById('memberEmail').value = member.email; document.getElementById('memberGender').value = member.gender; document.getElementById('memberBirthDate').value = member.birthday; document.getElementById('memberJoinedAt').value = member.joinedAt; document.getElementById('memberAddress').value = member.address; document.getElementById('position').value = member.position; document.getElementById('memberNotes').value = member.notes; document.getElementById('memberPhotoInput').value = ''; document.getElementById('memberSubmitBtn').textContent = 'Update Member'; document.getElementById('memberFormTitle').textContent = 'Edit Member Profile'; updateMemberPhotoPreview(member.photo); setMemberFormVisibility(true); setSettingsMessage('memberFormMessage', 'Editing member profile.', false); setSettingsMessage('memberToolbarMessage', '', false); document.getElementById('members').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
        function deleteMember(i) { if (!confirm('Delete this member profile?')) return; members.splice(i, 1); if (editingMemberIndex === i) { hideMemberForm(); } else if (editingMemberIndex !== null && editingMemberIndex > i) { editingMemberIndex -= 1; } persistData(); loadData(); setSettingsMessage('memberToolbarMessage', 'Member profile deleted.', false); }
        function updatePosition(i, pos) { members[i].position = pos; persistData(); loadData(); }
        function saveMemberField(i, field, value) { members[i][field] = value.trim(); persistData(); loadData(); }

        function addCategory() { let category = document.getElementById('categoryInput').value.trim(); if (!category) return alert('Enter a category name'); if (activityCategories.some(item => item.toLowerCase() === category.toLowerCase())) return alert('Category already exists'); activityCategories.push(category); activityCategories.sort((a, b) => a.localeCompare(b)); persistData(); document.getElementById('categoryInput').value = ''; loadData(); }
        function deleteCategory(i) { if (activities.some(activity => activity.category === activityCategories[i])) return alert('Delete activities in this category first.'); activityCategories.splice(i, 1); persistData(); loadData(); }
        function addActivity() { let category = document.getElementById('activityCategory').value; let title = document.getElementById('activityTitle').value.trim(); let date = document.getElementById('activityDate').value; let leader = document.getElementById('activityLeader').value.trim(); let description = document.getElementById('activityDescription').value.trim(); if (!category) return alert('Create a category first'); if (!title) return alert('Enter an activity title'); activities.unshift({ category, title, date, leader, description }); selectedActivityIndex = 0; persistData(); document.getElementById('activityTitle').value = ''; document.getElementById('activityDate').value = ''; document.getElementById('activityLeader').value = ''; document.getElementById('activityDescription').value = ''; loadData(); }
        function selectActivity(i) { selectedActivityIndex = i; renderActivityList(); renderActivityDetails(); }
        function deleteActivity(i) { activities.splice(i, 1); ensureActivitySelection(); persistData(); loadData(); }

        function getTodayDateValue() {
            const now = new Date();
            return new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        }

        function getShiftedDateValue(dateValue, days) {
            const base = dateValue ? new Date(`${dateValue}T00:00`) : new Date(`${getTodayDateValue()}T00:00`);
            if (Number.isNaN(base.getTime())) return getTodayDateValue();
            base.setDate(base.getDate() + Number(days || 0));
            return new Date(base.getTime() - (base.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        }

        function getLatestSaturdayDate() {
            const recordedSaturday = incomes
                .map(normalizeIncome)
                .filter((income) => {
                    const parsed = new Date(`${income.date}T00:00`);
                    return !Number.isNaN(parsed.getTime()) && parsed.getDay() === 6;
                })
                .sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')))[0];
            if (recordedSaturday) return recordedSaturday.date;
            const today = getTodayDateValue();
            const parsed = new Date(`${today}T00:00`);
            const daysSinceSaturday = (parsed.getDay() + 1) % 7;
            return getShiftedDateValue(today, -daysSinceSaturday);
        }

        function sortRecordsByDateDesc(items, key) {
            return [...items].sort((left, right) => String(right[key] || '').localeCompare(String(left[key] || '')));
        }

        function sortContributionsByMonthDesc(items) {
            return [...items].sort((left, right) => String(right.month || '').localeCompare(String(left.month || '')));
        }

        function normalizeFinanceCollections() {
            incomes = sortRecordsByDateDesc(incomes.map(normalizeIncome), 'date');
            expenses = sortRecordsByDateDesc(expenses.map(normalizeExpense), 'date');
            borrowings = sortRecordsByDateDesc(borrowings.map(normalizeBorrowing), 'date');
            contributions = sortContributionsByMonthDesc(contributions.map(normalizeContribution));
        }

        function getPreferredIncomeMember(type) {
            const select = document.getElementById('memberSelect');
            if (!select) return '';
            const firstMemberOption = Array.from(select.options).find((option) => option.value && option.value !== GENERAL_COLLECTION_LABEL);
            if (type === 'COG Contribution' || type === 'Tithe') {
                return firstMemberOption ? firstMemberOption.value : '';
            }
            return GENERAL_COLLECTION_LABEL;
        }

        function syncIncomeMemberMode() {
            const incomeType = document.getElementById('incomeType');
            const memberSelect = document.getElementById('memberSelect');
            if (!incomeType || !memberSelect) return;
            const requiresNamedMember = incomeType.value === 'COG Contribution' || incomeType.value === 'Tithe';
            const generalOption = Array.from(memberSelect.options).find((option) => option.value === GENERAL_COLLECTION_LABEL);
            if (generalOption) {
                generalOption.disabled = requiresNamedMember;
                generalOption.hidden = requiresNamedMember;
            }
            if (requiresNamedMember && memberSelect.value === GENERAL_COLLECTION_LABEL) {
                memberSelect.value = getPreferredIncomeMember(incomeType.value);
            }
            if (!requiresNamedMember && !memberSelect.value) {
                memberSelect.value = GENERAL_COLLECTION_LABEL;
            }
        }

        function setFinanceDefaults() {
            const latestSaturday = getLatestSaturdayDate();
            const today = getTodayDateValue();
            const incomeType = document.getElementById('incomeType');
            const memberSelect = document.getElementById('memberSelect');
            const incomeDate = document.getElementById('incomeDate');
            const financeSaturdayDate = document.getElementById('financeSaturdayDate');
            const expenseDate = document.getElementById('expenseDate');
            const borrowDate = document.getElementById('borrowDate');
            const contributionMonth = document.getElementById('contributionMonth');
            if (incomeType && !incomeType.value) incomeType.value = 'COG Contribution';
            if (memberSelect && memberSelect.options.length && !memberSelect.value) memberSelect.value = getPreferredIncomeMember(incomeType ? incomeType.value : 'COG Contribution');
            if (incomeDate && !incomeDate.value) incomeDate.value = latestSaturday;
            if (financeSaturdayDate && !financeSaturdayDate.value) financeSaturdayDate.value = latestSaturday;
            if (expenseDate && !expenseDate.value) expenseDate.value = today;
            if (borrowDate && !borrowDate.value) borrowDate.value = today;
            if (contributionMonth && !contributionMonth.value) contributionMonth.value = today.slice(0, 7);
            syncIncomeMemberMode();
        }

        function jumpToCurrentSaturday() {
            const saturday = getLatestSaturdayDate();
            document.getElementById('financeSaturdayDate').value = saturday;
            renderSaturdaySummary();
            setSettingsMessage('financeMessage', 'Saturday record view updated to ' + formatDate(saturday) + '.', false);
        }

        function addIncome() {
            const income = normalizeIncome({
                type: document.getElementById('incomeType').value,
                member: document.getElementById('memberSelect').value || GENERAL_COLLECTION_LABEL,
                amount: Number(document.getElementById('amount').value),
                note: document.getElementById('note').value.trim(),
                date: document.getElementById('incomeDate').value || getLatestSaturdayDate(),
                bookRef: document.getElementById('incomeBookRef').value.trim()
            });
            if (!income.amount || income.amount <= 0) return setSettingsMessage('financeMessage', 'Enter a valid income amount first.', true);
            if ((income.type === 'COG Contribution' || income.type === 'Tithe') && (!income.member || income.member === GENERAL_COLLECTION_LABEL)) {
                return setSettingsMessage('financeMessage', `Choose a real member for ${income.type}.`, true);
            }
            incomes = sortRecordsByDateDesc([...incomes.map(normalizeIncome), income], 'date');
            persistData();
            document.getElementById('amount').value = '';
            document.getElementById('note').value = '';
            document.getElementById('incomeDate').value = income.date;
            document.getElementById('financeSaturdayDate').value = income.date;
            loadData();
            document.getElementById('memberSelect').value = getPreferredIncomeMember(document.getElementById('incomeType').value);
            document.getElementById('amount').focus();
            setSettingsMessage('financeMessage', `${income.type} recorded for ${formatDate(income.date)}.`, false);
        }

        function addMonthlyContribution() {
            const member = document.getElementById('contributionMemberSelect').value;
            const amount = Number(document.getElementById('contributionAmount').value);
            const month = document.getElementById('contributionMonth').value;
            if (!member) return setSettingsMessage('financeMessage', 'Add members before recording monthly contributions.', true);
            if (!amount || amount <= 0 || !month) return setSettingsMessage('financeMessage', 'Enter a member, amount, and month for the contribution.', true);
            contributions = sortContributionsByMonthDesc([...contributions.map(normalizeContribution), normalizeContribution({ member, amount, month })]);
            persistData();
            document.getElementById('contributionAmount').value = '';
            loadData();
            document.getElementById('contributionAmount').focus();
            setSettingsMessage('financeMessage', 'Monthly contribution saved for ' + member + '.', false);
        }

        function addExpense() {
            const expense = normalizeExpense({
                name: document.getElementById('expenseName').value.trim(),
                amount: Number(document.getElementById('expenseAmount').value),
                date: document.getElementById('expenseDate').value || getTodayDateValue()
            });
            if (!expense.name || !expense.amount || expense.amount <= 0) return setSettingsMessage('financeMessage', 'Enter a valid expense description and amount.', true);
            expenses = sortRecordsByDateDesc([...expenses.map(normalizeExpense), expense], 'date');
            persistData();
            document.getElementById('expenseName').value = '';
            document.getElementById('expenseAmount').value = '';
            document.getElementById('expenseDate').value = expense.date;
            loadData();
            document.getElementById('expenseName').focus();
            setSettingsMessage('financeMessage', 'Expense added for ' + formatDate(expense.date) + '.', false);
        }

        function addBorrowing() {
            const member = document.getElementById('borrowMemberSelect').value;
            const amount = Number(document.getElementById('borrowAmount').value);
            const note = document.getElementById('borrowNote').value.trim();
            const date = document.getElementById('borrowDate').value || getTodayDateValue();
            if (!member) return setSettingsMessage('financeMessage', 'Add members before recording a borrowing.', true);
            if (!amount || amount <= 0) return setSettingsMessage('financeMessage', 'Enter a valid borrowing amount.', true);
            borrowings = sortRecordsByDateDesc([...borrowings.map(normalizeBorrowing), normalizeBorrowing({ member, amount, note, date, status: 'Unpaid' })], 'date');
            persistData();
            document.getElementById('borrowAmount').value = '';
            document.getElementById('borrowNote').value = '';
            document.getElementById('borrowDate').value = date;
            loadData();
            document.getElementById('borrowAmount').focus();
            setSettingsMessage('financeMessage', 'Borrowing recorded for ' + member + '.', false);
        }

        function deleteIncome(i) {
            incomes.splice(i, 1);
            persistData();
            loadData();
            setSettingsMessage('financeMessage', 'Income record removed.', false);
        }

        function deleteExpense(i) {
            expenses.splice(i, 1);
            persistData();
            loadData();
            setSettingsMessage('financeMessage', 'Expense record removed.', false);
        }

        function deleteBorrowing(i) {
            borrowings.splice(i, 1);
            persistData();
            loadData();
            setSettingsMessage('financeMessage', 'Borrowing record removed.', false);
        }

        function markPaid(i) {
            borrowings[i] = normalizeBorrowing({ ...borrowings[i], status: 'Paid' });
            persistData();
            loadData();
            setSettingsMessage('financeMessage', 'Loan marked as paid.', false);
        }

        function deleteContribution(i) {
            contributions.splice(i, 1);
            persistData();
            loadData();
            setSettingsMessage('financeMessage', 'Monthly contribution removed.', false);
        }

        function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"']/g, function (char) { if (char === '&') return '&amp;'; if (char === '<') return '&lt;'; if (char === '>') return '&gt;'; if (char === '\"') return '&quot;'; return '&#39;'; }); }
        function formatETB(amount) { return Number(amount || 0).toLocaleString() + ' ETB'; }
        function formatDate(value) { if (!value) return 'No date set'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString(appSettings.locale || 'en-ET', { year: 'numeric', month: 'short', day: 'numeric' }); }
        function getCategoryClass(category) {
            const normalized = String(category || '').toLowerCase();
            if (normalized.includes('announce')) return 'service-tone-announcement';
            if (normalized.includes('program') || normalized.includes('youth') || normalized.includes('choir')) return 'service-tone-program';
            if (normalized.includes('outreach') || normalized.includes('mission') || normalized.includes('evangel')) return 'service-tone-outreach';
            if (normalized.includes('prayer') || normalized.includes('worship') || normalized.includes('fast')) return 'service-tone-prayer';
            if (normalized.includes('meeting') || normalized.includes('training') || normalized.includes('class') || normalized.includes('fellowship')) return 'service-tone-meeting';
            if (normalized.includes('event') || normalized.includes('service')) return 'service-tone-event';
            return 'service-tone-custom';
        }

        function getActivityStatusClass(status) {
            if (status === 'Ongoing') return 'service-status-pill service-status-ongoing';
            if (status === 'Completed') return 'service-status-pill service-status-completed';
            return 'service-status-pill service-status-scheduled';
        }

        function buildActivityTimestamp(activity) {
            if (!activity.date) return Number.MAX_SAFE_INTEGER;
            const parsed = new Date(`${activity.date}T${activity.time || '00:00'}`).getTime();
            return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed;
        }

        function formatActivitySchedule(activity) {
            if (!activity.date && !activity.time) return 'Date not set';
            const dateLabel = activity.date ? formatDate(activity.date) : 'No date';
            return activity.time ? `${dateLabel} at ${activity.time}` : dateLabel;
        }

        function truncateText(value, maxLength) {
            const text = String(value || '');
            return text.length > maxLength ? text.slice(0, maxLength).trim() + '...' : text;
        }

        function ensureActivitySelection(filteredIndexes) {
            if (!filteredIndexes || !filteredIndexes.length) {
                selectedActivityIndex = null;
                return;
            }
            if (selectedActivityIndex === null || !activities[selectedActivityIndex] || !filteredIndexes.includes(selectedActivityIndex)) {
                selectedActivityIndex = filteredIndexes[0];
            }
        }

        function populateMemberSelects() {
            [
                { id: 'memberSelect', includeGeneral: true },
                { id: 'borrowMemberSelect', includeGeneral: false },
                { id: 'contributionMemberSelect', includeGeneral: false }
            ].forEach(({ id, includeGeneral }) => {
                const select = document.getElementById(id);
                if (!select) return;
                const previousValue = select.value;
                const options = includeGeneral
                    ? [{ value: GENERAL_COLLECTION_LABEL, label: GENERAL_COLLECTION_LABEL }, ...members.map((member) => ({ value: member.name, label: member.name }))]
                    : members.map((member) => ({ value: member.name, label: member.name }));
                if (!options.length) {
                    select.innerHTML = '<option value=\"\">No members yet</option>';
                    return;
                }
                select.innerHTML = options.map((option) => `<option value=\"${escapeHtml(option.value)}\">${escapeHtml(option.label)}</option>`).join('');
                if (options.some((option) => option.value === previousValue)) {
                    select.value = previousValue;
                } else if (includeGeneral) {
                    select.value = GENERAL_COLLECTION_LABEL;
                } else {
                    select.value = options[0].value;
                }
            });
        }
        function renderMembers(search) { const container = document.getElementById('memberContainer'); const filtered = members.filter((m) => [m.name, m.phone, m.email, m.address, m.position, m.gender, m.birthday, m.joinedAt, m.notes].join(' ').toLowerCase().includes(search)); if (!filtered.length) { container.innerHTML = '<p style=\"text-align:center; width:100%;\">No members found.</p>'; return; } container.innerHTML = filtered.map((m) => { const i = members.indexOf(m); return `<details class=\"member-card\"><summary class=\"member-summary\"><div class=\"member-identity\">${m.photo ? `<img class=\"member-photo\" src=\"${escapeHtml(m.photo)}\" alt=\"${escapeHtml(m.name)}\">` : `<div class=\"member-photo member-photo-fallback\"><i class=\"fa fa-user\"></i></div>`}<div class=\"member-info\"><div class=\"member-title-row\"><div class=\"member-name-text\">${escapeHtml(m.name)}</div><span class=\"member-role-badge\">${escapeHtml(m.position)}</span></div><div class=\"member-contact-line\"><span><i class=\"fa fa-phone\"></i>${escapeHtml(m.phone || 'No phone')}</span><span><i class=\"fa fa-envelope\"></i>${escapeHtml(m.email || 'No email')}</span></div></div></div><div class=\"member-summary-meta\"><span class=\"member-collapse-note\">Click profile to show details</span><span class=\"member-toggle-icon\"><i class=\"fas fa-chevron-down\"></i></span></div><div class=\"member-actions\"><button class=\"member-action-btn\" onclick=\"event.preventDefault(); event.stopPropagation(); editMember(${i})\" title=\"Edit member\"><i class=\"fas fa-pen\"></i></button><button class=\"member-action-btn member-delete-btn\" onclick=\"event.preventDefault(); event.stopPropagation(); deleteMember(${i})\" title=\"Delete member\"><i class=\"fas fa-trash\"></i></button></div></summary><div class=\"member-card-body\"><div class=\"member-details-grid\"><div class=\"member-detail\"><span>Gender</span><strong>${escapeHtml(m.gender || 'Not set')}</strong></div><div class=\"member-detail\"><span>Birth Date</span><strong>${escapeHtml(m.birthday ? formatDate(m.birthday) : 'Not set')}</strong></div><div class=\"member-detail\"><span>Joined</span><strong>${escapeHtml(formatDate(m.joinedAt))}</strong></div><div class=\"member-detail\"><span>Address</span><strong>${escapeHtml(m.address || 'Not set')}</strong></div><div class=\"member-detail\"><span>Phone</span><strong>${escapeHtml(m.phone || 'Not set')}</strong></div><div class=\"member-detail\"><span>Email</span><strong>${escapeHtml(m.email || 'Not set')}</strong></div></div><div class=\"member-notes-box\"><span>Notes</span>${escapeHtml(m.notes || 'No additional details provided.')}</div></div></details>`; }).join(''); }

        function addCategory() {
            const input = document.getElementById('categoryInput');
            const category = String(input.value || '').trim();
            if (!category) return setSettingsMessage('serviceCategoryMessage', 'Enter a category name first.', true);
            if (activityCategories.some((item) => item.toLowerCase() === category.toLowerCase())) return setSettingsMessage('serviceCategoryMessage', 'That category already exists.', true);
            activityCategories = normalizeActivityCategories([...activityCategories, category], activities);
            persistData();
            input.value = '';
            loadData();
            setSettingsMessage('serviceCategoryMessage', 'Category added successfully.', false);
        }

        function deleteCategory(i) {
            const category = activityCategories[i];
            const inUse = activities.filter((activity) => activity.category === category).length;
            if (inUse) return setSettingsMessage('serviceCategoryMessage', 'Delete activities in this category first.', true);
            activityCategories.splice(i, 1);
            activityCategories = normalizeActivityCategories(activityCategories, activities);
            persistData();
            loadData();
            setSettingsMessage('serviceCategoryMessage', 'Category removed.', false);
        }

        function resetActivityForm() {
            editingActivityIndex = null;
            document.getElementById('activityFormTitle').textContent = 'Create Activity';
            document.getElementById('activitySubmitBtn').textContent = 'Save Activity';
            document.getElementById('activityStatus').value = 'Scheduled';
            document.getElementById('activityTitle').value = '';
            document.getElementById('activityDate').value = '';
            document.getElementById('activityTime').value = '';
            document.getElementById('activityLeader').value = '';
            document.getElementById('activityLocation').value = '';
            document.getElementById('activityDescription').value = '';
            document.getElementById('activityFeatured').checked = false;
            if (activityCategories.length) {
                document.getElementById('activityCategory').value = activityCategories[0];
            }
            setSettingsMessage('serviceFormMessage', '', false);
        }

        function collectActivityFormData() {
            return normalizeActivity({
                category: document.getElementById('activityCategory').value,
                status: document.getElementById('activityStatus').value,
                title: document.getElementById('activityTitle').value.trim(),
                date: document.getElementById('activityDate').value,
                time: document.getElementById('activityTime').value,
                leader: document.getElementById('activityLeader').value.trim(),
                location: document.getElementById('activityLocation').value.trim(),
                description: document.getElementById('activityDescription').value.trim(),
                featured: document.getElementById('activityFeatured').checked,
                createdAt: editingActivityIndex !== null && activities[editingActivityIndex] ? activities[editingActivityIndex].createdAt : new Date().toISOString()
            });
        }

        function saveActivity() {
            const activity = collectActivityFormData();
            if (!activity.category) return setSettingsMessage('serviceFormMessage', 'Choose a category first.', true);
            if (!activity.title) return setSettingsMessage('serviceFormMessage', 'Activity title is required.', true);
            const successMessage = editingActivityIndex !== null ? 'Activity updated successfully.' : 'Activity created successfully.';
            if (editingActivityIndex !== null) {
                activities[editingActivityIndex] = activity;
                selectedActivityIndex = editingActivityIndex;
            } else {
                activities.unshift(activity);
                selectedActivityIndex = 0;
            }
            activities = activities.map(normalizeActivity);
            activityCategories = normalizeActivityCategories(activityCategories, activities);
            persistData();
            loadData();
            resetActivityForm();
            setSettingsMessage('serviceFormMessage', successMessage, false);
        }

        function editActivity(i) {
            const activity = normalizeActivity(activities[i]);
            editingActivityIndex = i;
            selectedActivityIndex = i;
            document.getElementById('activityCategory').value = activity.category;
            document.getElementById('activityStatus').value = activity.status;
            document.getElementById('activityTitle').value = activity.title;
            document.getElementById('activityDate').value = activity.date;
            document.getElementById('activityTime').value = activity.time;
            document.getElementById('activityLeader').value = activity.leader;
            document.getElementById('activityLocation').value = activity.location;
            document.getElementById('activityDescription').value = activity.description;
            document.getElementById('activityFeatured').checked = !!activity.featured;
            document.getElementById('activityFormTitle').textContent = 'Edit Activity';
            document.getElementById('activitySubmitBtn').textContent = 'Update Activity';
            setSettingsMessage('serviceFormMessage', 'Editing selected activity.', false);
            document.getElementById('services').scrollIntoView({ behavior: 'smooth', block: 'start' });
            renderServices();
        }

        function deleteActivity(i) {
            if (!confirm('Delete this activity?')) return;
            activities.splice(i, 1);
            if (editingActivityIndex === i) {
                resetActivityForm();
            } else if (editingActivityIndex !== null && editingActivityIndex > i) {
                editingActivityIndex -= 1;
            }
            persistData();
            loadData();
            setSettingsMessage('serviceFormMessage', 'Activity deleted.', false);
        }

        function toggleActivityFeatured(i) {
            activities[i].featured = !activities[i].featured;
            persistData();
            loadData();
            setSettingsMessage('serviceFormMessage', activities[i].featured ? 'Activity marked as featured.' : 'Activity removed from featured list.', false);
        }

        function cycleActivityStatus(i) {
            const currentIndex = ACTIVITY_STATUS_OPTIONS.indexOf(activities[i].status);
            activities[i].status = ACTIVITY_STATUS_OPTIONS[(currentIndex + 1) % ACTIVITY_STATUS_OPTIONS.length];
            persistData();
            loadData();
        }

        function selectActivity(i) {
            selectedActivityIndex = i;
            renderServices();
        }

        function getFilteredActivityIndexes() {
            const searchValue = (document.getElementById('activitySearch').value || '').toLowerCase();
            const categoryFilter = document.getElementById('activityFilterCategory').value || 'all';
            const statusFilter = document.getElementById('activityFilterStatus').value || 'all';
            return activities
                .map((activity, index) => ({ activity, index }))
                .filter(({ activity }) => {
                    const haystack = [activity.category, activity.title, activity.description, activity.leader, activity.location, activity.status, activity.date, activity.time].join(' ').toLowerCase();
                    const matchesSearch = !searchValue || haystack.includes(searchValue);
                    const matchesCategory = categoryFilter === 'all' || activity.category === categoryFilter;
                    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
                    return matchesSearch && matchesCategory && matchesStatus;
                })
                .sort((left, right) => {
                    if (left.activity.featured !== right.activity.featured) return left.activity.featured ? -1 : 1;
                    const leftPriority = left.activity.status === 'Ongoing' ? 0 : left.activity.status === 'Scheduled' ? 1 : 2;
                    const rightPriority = right.activity.status === 'Ongoing' ? 0 : right.activity.status === 'Scheduled' ? 1 : 2;
                    if (leftPriority !== rightPriority) return leftPriority - rightPriority;
                    const leftStamp = buildActivityTimestamp(left.activity);
                    const rightStamp = buildActivityTimestamp(right.activity);
                    if (leftStamp !== rightStamp) return leftStamp - rightStamp;
                    return new Date(right.activity.createdAt).getTime() - new Date(left.activity.createdAt).getTime();
                })
                .map((entry) => entry.index);
        }

        function renderServiceSummary() {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const upcoming = activities.filter((activity) => activity.status !== 'Completed' && (!activity.date || buildActivityTimestamp(activity) >= today.getTime())).length;
            const featured = activities.filter((activity) => activity.featured).length;
            document.getElementById('serviceStatTotal').textContent = activities.length;
            document.getElementById('serviceStatUpcoming').textContent = upcoming;
            document.getElementById('serviceStatFeatured').textContent = featured;
            document.getElementById('serviceStatCategories').textContent = activityCategories.length;
        }

        function renderCategoryOptions() {
            const formSelect = document.getElementById('activityCategory');
            const filterSelect = document.getElementById('activityFilterCategory');
            const currentFormValue = formSelect.value;
            const currentFilterValue = filterSelect.value || 'all';
            formSelect.innerHTML = activityCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('');
            filterSelect.innerHTML = `<option value="all">All Categories</option>${activityCategories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')}`;
            formSelect.value = activityCategories.includes(currentFormValue) ? currentFormValue : (activityCategories[0] || '');
            filterSelect.value = activityCategories.includes(currentFilterValue) ? currentFilterValue : 'all';
        }

        function renderCategoryList() {
            const container = document.getElementById('categoryList');
            if (!activityCategories.length) {
                container.innerHTML = '<div class="service-empty-state"><i class="fa fa-layer-group"></i><div>No categories yet.</div></div>';
                return;
            }
            container.innerHTML = activityCategories.map((category, i) => {
                const total = activities.filter((activity) => activity.category === category).length;
                const disabled = total > 0 ? 'disabled' : '';
                const deleteTitle = total > 0 ? 'Delete activities in this category first' : 'Delete category';
                return `<div class="service-category-item ${getCategoryClass(category)}"><div><h4>${escapeHtml(category)}</h4><p>${total} ${total === 1 ? 'activity' : 'activities'}</p></div><div class="service-category-actions"><span class="service-category-count">${total}</span><button class="service-inline-icon-btn delete" ${disabled} onclick="deleteCategory(${i})" title="${escapeHtml(deleteTitle)}"><i class="fas fa-trash"></i></button></div></div>`;
            }).join('');
        }

        function renderActivityList(filteredIndexes) {
            const list = document.getElementById('activityList');
            if (!filteredIndexes.length) {
                list.innerHTML = '<div class="service-empty-state"><i class="fa fa-calendar-xmark"></i><div>No activities match the current search or filter.</div></div>';
                return;
            }
            list.innerHTML = filteredIndexes.map((index) => {
                const activity = activities[index];
                const toneClass = getCategoryClass(activity.category);
                const activeClass = selectedActivityIndex === index ? ' active' : '';
                const description = escapeHtml(truncateText(activity.description || 'No description added yet.', 120));
                return `<article class="service-activity-card ${toneClass}${activeClass}" onclick="selectActivity(${index})"><div class="service-card-top"><div class="service-detail-chip-row"><span class="service-badge">${escapeHtml(activity.category)}</span><span class="${getActivityStatusClass(activity.status)}">${escapeHtml(activity.status)}</span>${activity.featured ? '<span class="service-status-pill"><i class="fa fa-star service-featured-star"></i>&nbsp;Featured</span>' : ''}</div><div class="service-card-actions"><button class="service-inline-icon-btn" onclick="event.stopPropagation(); toggleActivityFeatured(${index})" title="${activity.featured ? 'Remove featured' : 'Feature activity'}"><i class="fa fa-star ${activity.featured ? 'service-featured-star' : ''}"></i></button><button class="service-inline-icon-btn" onclick="event.stopPropagation(); editActivity(${index})" title="Edit activity"><i class="fas fa-pen"></i></button><button class="service-inline-icon-btn delete" onclick="event.stopPropagation(); deleteActivity(${index})" title="Delete activity"><i class="fas fa-trash"></i></button></div></div><div><h4>${escapeHtml(activity.title)}</h4><p>${description}</p></div><div class="service-activity-meta"><span class="service-meta-item"><i class="fa fa-calendar-day"></i>${escapeHtml(formatActivitySchedule(activity))}</span><span class="service-meta-item"><i class="fa fa-user"></i>${escapeHtml(activity.leader || 'Leader not assigned')}</span><span class="service-meta-item"><i class="fa fa-location-dot"></i>${escapeHtml(activity.location || 'Location not set')}</span></div></article>`;
            }).join('');
        }

        function renderActivityDetails() {
            const details = document.getElementById('activityDetails');
            if (selectedActivityIndex === null || !activities[selectedActivityIndex]) {
                details.innerHTML = '<div class="service-empty-state"><i class="fa fa-calendar-days"></i><div>Select an activity to view full details, status, and quick actions.</div></div>';
                return;
            }
            const activity = activities[selectedActivityIndex];
            details.innerHTML = `<div class="service-details-shell ${getCategoryClass(activity.category)}"><div class="service-card-top"><div><div class="service-detail-chip-row"><span class="service-badge">${escapeHtml(activity.category)}</span><span class="${getActivityStatusClass(activity.status)}">${escapeHtml(activity.status)}</span>${activity.featured ? '<span class="service-status-pill"><i class="fa fa-star service-featured-star"></i>&nbsp;Featured</span>' : ''}</div><h4>${escapeHtml(activity.title)}</h4><p class="service-note">${escapeHtml(activity.description || 'No description added for this activity yet.')}</p></div><div class="service-detail-action-row"><button class="service-ghost-btn" onclick="editActivity(${selectedActivityIndex})">Edit</button><button class="service-ghost-btn secondary" onclick="toggleActivityFeatured(${selectedActivityIndex})">${activity.featured ? 'Unfeature' : 'Feature'}</button><button class="service-ghost-btn secondary" onclick="cycleActivityStatus(${selectedActivityIndex})">Next Status</button><button class="service-ghost-btn danger" onclick="deleteActivity(${selectedActivityIndex})">Delete</button></div></div><div class="service-detail-grid"><div class="service-detail-box"><span>Schedule</span><div>${escapeHtml(formatActivitySchedule(activity))}</div></div><div class="service-detail-box"><span>Leader</span><strong>${escapeHtml(activity.leader || 'Not assigned')}</strong></div><div class="service-detail-box"><span>Location</span><strong>${escapeHtml(activity.location || 'Not set')}</strong></div><div class="service-detail-box"><span>Created</span><strong>${escapeHtml(formatDateTime(activity.createdAt))}</strong></div></div><div class="service-notes-box"><strong>Ministry Notes</strong><p class="service-note">${escapeHtml(activity.description || 'No extra notes available.')}</p></div></div>`;
        }

        function renderServices() {
            activityCategories = normalizeActivityCategories(activityCategories, activities);
            renderServiceSummary();
            renderCategoryOptions();
            renderCategoryList();
            const filteredIndexes = getFilteredActivityIndexes();
            ensureActivitySelection(filteredIndexes);
            renderActivityList(filteredIndexes);
            renderActivityDetails();
        }
        function renderFinanceListState(listId, html, emptyText) {
            const element = document.getElementById(listId);
            if (!element) return;
            element.innerHTML = html || `<li class="finance-empty-state"><span>${escapeHtml(emptyText)}</span></li>`;
        }

        function renderFinanceLists() {
            renderFinanceListState('incomeList', incomes.map((income, i) => `
        <li>
            <div class="finance-list-main">
                <strong>${escapeHtml(income.type)} • ${formatETB(income.amount)}</strong>
                <div class="finance-list-meta">
                    ${escapeHtml(income.member || GENERAL_COLLECTION_LABEL)} | ${escapeHtml(formatDate(income.date))}
                    ${income.bookRef ? ` | Book: ${escapeHtml(income.bookRef)}` : ''}
                    ${income.note ? ` | ${escapeHtml(income.note)}` : ''}
                </div>
            </div>
            <div class="finance-list-actions">
                <button type="button" onclick="deleteIncome(${i})">Delete</button>
            </div>
        </li>
    `).join(''), 'No COG contribution, offering, tithe, or other income records yet.');

            renderFinanceListState('expenseList', expenses.map((expense, i) => `
        <li>
            <div class="finance-list-main">
                <strong>${escapeHtml(expense.name)} • ${formatETB(expense.amount)}</strong>
                <div class="finance-list-meta">${escapeHtml(formatDate(expense.date))}</div>
            </div>
            <div class="finance-list-actions">
                <button type="button" onclick="deleteExpense(${i})">Delete</button>
            </div>
        </li>
    `).join(''), 'No expenses have been recorded yet.');

            renderFinanceListState('borrowList', borrowings.map((borrowing, i) => `
        <li>
            <div class="finance-list-main">
                <strong>${escapeHtml(borrowing.member)} • ${formatETB(borrowing.amount)}</strong>
                <div class="finance-list-meta">
                    ${escapeHtml(formatDate(borrowing.date))} | ${escapeHtml(borrowing.status)}
                    ${borrowing.note ? ` | ${escapeHtml(borrowing.note)}` : ''}
                </div>
            </div>
            <div class="finance-list-actions">
                ${borrowing.status === 'Unpaid' ? `<button type="button" onclick="markPaid(${i})">Paid</button>` : ''}
                <button type="button" onclick="deleteBorrowing(${i})">Delete</button>
            </div>
        </li>
    `).join(''), 'No borrowing records yet.');

            renderFinanceListState('contributionList', contributions.map((contribution, i) => `
        <li>
            <div class="finance-list-main">
                <strong>${escapeHtml(contribution.member)} • ${formatETB(contribution.amount)}</strong>
                <div class="finance-list-meta">${escapeHtml(contribution.month || 'No month selected')}</div>
            </div>
            <div class="finance-list-actions">
                <button type="button" onclick="deleteContribution(${i})">Delete</button>
            </div>
        </li>
    `).join(''), 'No monthly contributions recorded yet.');
        }

        function getFinancialTotals() {
            const totalGiving = incomes.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const totalExpenses = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const totalBorrowed = borrowings.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const monthlyContributionTotal = contributions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const outstandingLoans = borrowings.filter((item) => item.status === 'Unpaid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const paidLoansTotal = borrowings.filter((item) => item.status === 'Paid').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const cogContributionTotal = incomes.filter((item) => item.type === 'COG Contribution').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const offeringTotal = incomes.filter((item) => item.type === 'Offering').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const titheTotal = incomes.filter((item) => item.type === 'Tithe').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const otherIncomeTotal = incomes.filter((item) => !['COG Contribution', 'Offering', 'Tithe'].includes(item.type)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const netBalance = totalGiving + monthlyContributionTotal - totalExpenses;
            const latestSaturdayDate = getLatestSaturdayDate();
            const latestSaturdayTotal = incomes.filter((item) => item.date === latestSaturdayDate).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            return { totalGiving, totalExpenses, totalBorrowed, monthlyContributionTotal, outstandingLoans, paidLoansTotal, cogContributionTotal, offeringTotal, titheTotal, otherIncomeTotal, netBalance, latestSaturdayTotal, latestSaturdayDate };
        }

        function buildReportSnapshot(totals) {
            const roleCounts = {};
            members.forEach((member) => { const role = member.position || 'Member'; roleCounts[role] = (roleCounts[role] || 0) + 1; });

            const activityStatusCounts = { Scheduled: 0, Ongoing: 0, Completed: 0 };
            activities.forEach((activity) => { activityStatusCounts[activity.status] = (activityStatusCounts[activity.status] || 0) + 1; });

            const categoryCounts = normalizeActivityCategories(activityCategories, activities)
                .map((category) => ({ category, count: activities.filter((activity) => activity.category === category).length }))
                .sort((left, right) => right.count - left.count);

            const topRole = Object.entries(roleCounts).sort((left, right) => right[1] - left[1])[0];
            const largestExpense = expenses.reduce((largest, expense) => Number(expense.amount || 0) > Number(largest.amount || 0) ? expense : largest, { name: 'No expenses recorded', amount: 0 });
            const unpaidLoans = borrowings.filter((item) => item.status === 'Unpaid');
            const featuredActivities = activities.filter((activity) => activity.featured);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const activeActivities = activities.filter((activity) => activity.status !== 'Completed' && (!activity.date || buildActivityTimestamp(activity) >= today.getTime()));

            const highlights = [
                members.length ? `${members.length} members are recorded, and ${topRole ? topRole[0] : 'Member'} is currently the largest role group.` : 'No members have been added yet, so membership reporting is still empty.',
                activities.length ? `${activeActivities.length} activities are active or upcoming, and ${featuredActivities.length} are featured for quick attention.` : 'No church activities are currently recorded in the system.',
                `COG contributions total ${formatETB(totals.cogContributionTotal)}, offerings total ${formatETB(totals.offeringTotal)}, tithes total ${formatETB(totals.titheTotal)}, and other income adds up to ${formatETB(totals.otherIncomeTotal)}.`,
                `Net balance stands at ${formatETB(totals.netBalance)} after ${formatETB(totals.totalExpenses)} in recorded expenses.`,
                unpaidLoans.length ? `${unpaidLoans.length} unpaid loan(s) remain, totaling ${formatETB(totals.outstandingLoans)}.` : 'No unpaid loans are currently recorded.',
                Number(largestExpense.amount || 0) > 0 ? `Largest recorded expense: ${largestExpense.name} at ${formatETB(largestExpense.amount)}.` : 'No expenses have been recorded yet.'
            ];

            const timeline = [
                ...activities.map((activity) => ({ stamp: activity.date ? buildActivityTimestamp(activity) : new Date(activity.createdAt).getTime(), title: activity.title || 'Activity', meta: `${activity.category} | ${activity.status}`, when: formatActivitySchedule(activity) })),
                ...incomes.map((income) => ({ stamp: income.date ? new Date(`${income.date}T00:00`).getTime() : 0, title: `${income.type} record`, meta: `${formatETB(income.amount)} | ${income.member}`, when: income.date ? formatDate(income.date) : 'No date' })),
                ...borrowings.map((borrowing) => ({ stamp: borrowing.date ? new Date(`${borrowing.date}T00:00`).getTime() : 0, title: `${borrowing.member} borrowing`, meta: `${formatETB(borrowing.amount)} | ${borrowing.status}`, when: borrowing.date ? formatDate(borrowing.date) : 'No date' })),
                ...contributions.map((contribution) => ({ stamp: contribution.month ? new Date(`${contribution.month}-01T00:00`).getTime() : 0, title: `${contribution.member} contribution`, meta: formatETB(contribution.amount), when: contribution.month || 'No month' }))
            ]
                .filter((item) => Number.isFinite(item.stamp) && item.stamp > 0)
                .sort((left, right) => right.stamp - left.stamp)
                .slice(0, 6);

            return {
                generatedAt: new Date().toISOString(),
                roleCounts,
                activityStatusCounts,
                categoryCounts,
                featuredActivities,
                activeActivities,
                highlights,
                timeline
            };
        }

        function renderReports(totals) {
            const snapshot = buildReportSnapshot(totals);
            document.getElementById('reportGeneratedAt').textContent = formatDateTime(snapshot.generatedAt);
            document.getElementById('reportChurchLabel').textContent = appSettings.churchName;
            document.getElementById('reportLocale').textContent = appSettings.locale;
            document.getElementById('reportMembers').textContent = members.length;
            document.getElementById('reportActivities').textContent = activities.length;
            document.getElementById('reportFeaturedActivities').textContent = snapshot.featuredActivities.length;
            document.getElementById('reportCategories').textContent = activityCategories.length;
            document.getElementById('reportGiving').textContent = formatETB(totals.totalGiving);
            document.getElementById('reportMonthly').textContent = formatETB(totals.monthlyContributionTotal);
            document.getElementById('reportExpenses').textContent = formatETB(totals.totalExpenses);
            document.getElementById('reportNet').textContent = formatETB(totals.netBalance);
            document.getElementById('reportBorrowed').textContent = formatETB(totals.totalBorrowed);
            document.getElementById('reportOutstanding').textContent = formatETB(totals.outstandingLoans);
            const healthNote = document.getElementById('reportHealthNote');
            healthNote.textContent = totals.netBalance >= 0 ? 'Healthy Balance' : 'Needs Attention';
            healthNote.className = 'report-pill ' + (totals.netBalance >= 0 ? 'positive' : 'alert');
            document.getElementById('reportHighlights').innerHTML = snapshot.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
            document.getElementById('reportCategoryList').innerHTML = snapshot.categoryCounts.some((item) => item.count > 0) ? snapshot.categoryCounts.filter((item) => item.count > 0).map((item) => `<li><strong>${escapeHtml(item.category)}</strong><br>${item.count} ${item.count === 1 ? 'activity' : 'activities'}</li>`).join('') : '<li>No activity categories have data yet.</li>';
            document.getElementById('reportTimeline').innerHTML = snapshot.timeline.length ? snapshot.timeline.map((item) => `<div class="report-timeline-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.meta)}</span><small>${escapeHtml(item.when)}</small></div>`).join('') : '<div class="report-timeline-item"><strong>No recent records</strong><span>Activities, loans, and contributions will appear here once they are added.</span></div>';
            renderReportCharts(snapshot, totals);
        }

        function renderFinanceOverview(totals) {
            document.getElementById('totalIncomeBadge').innerText = formatETB(totals.totalGiving);
            document.getElementById('totalExpenseBadge').innerText = formatETB(totals.totalExpenses);
            document.getElementById('totalBorrowBadge').innerText = formatETB(totals.totalBorrowed);
            document.getElementById('totalContributionBadge').innerText = formatETB(totals.monthlyContributionTotal);
            document.getElementById('financeContributionHero').innerText = formatETB(totals.cogContributionTotal);
            document.getElementById('financeOfferingHero').innerText = formatETB(totals.offeringTotal);
            document.getElementById('financeTitheHero').innerText = formatETB(totals.titheTotal);
            document.getElementById('financeOtherHero').innerText = formatETB(totals.otherIncomeTotal);
            document.getElementById('financeNetHero').innerText = formatETB(totals.netBalance);
            document.getElementById('incomeCogBadge').innerText = formatETB(totals.cogContributionTotal);
            document.getElementById('incomeOfferingBadge').innerText = formatETB(totals.offeringTotal);
            document.getElementById('incomeTitheBadge').innerText = formatETB(totals.titheTotal);
            document.getElementById('incomeOtherBadge').innerText = formatETB(totals.otherIncomeTotal);
        }

        function renderSaturdaySummary() {
            const input = document.getElementById('financeSaturdayDate');
            const selectedDate = input.value || getLatestSaturdayDate();
            if (!input.value) input.value = selectedDate;
            const records = incomes.filter((income) => income.date === selectedDate);
            const cogContributionTotal = records.filter((income) => income.type === 'COG Contribution').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const offeringTotal = records.filter((income) => income.type === 'Offering').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const titheTotal = records.filter((income) => income.type === 'Tithe').reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const otherTotal = records.filter((income) => !['COG Contribution', 'Offering', 'Tithe'].includes(income.type)).reduce((sum, item) => sum + Number(item.amount || 0), 0);
            const total = records.reduce((sum, item) => sum + Number(item.amount || 0), 0);
            document.getElementById('selectedSaturdayTotalBadge').innerText = formatETB(total);
            document.getElementById('saturdayCogContributions').innerText = formatETB(cogContributionTotal);
            document.getElementById('saturdayOfferings').innerText = formatETB(offeringTotal);
            document.getElementById('saturdayTithes').innerText = formatETB(titheTotal);
            document.getElementById('saturdayOther').innerText = formatETB(otherTotal);
            document.getElementById('saturdayCount').innerText = String(records.length);
            renderFinanceListState('saturdayRecordList', records.map((income) => `
        <li>
            <div class="finance-list-main">
                <strong>${escapeHtml(income.type)} • ${formatETB(income.amount)}</strong>
                <div class="finance-list-meta">
                    ${escapeHtml(income.member || GENERAL_COLLECTION_LABEL)}
                    ${income.bookRef ? ` | Book: ${escapeHtml(income.bookRef)}` : ''}
                    ${income.note ? ` | ${escapeHtml(income.note)}` : ''}
                </div>
            </div>
        </li>
    `).join(''), 'No income records were saved for this Saturday yet.');
        }

        function renderTotals() {
            const totals = getFinancialTotals();
            renderFinanceOverview(totals);
            document.getElementById('totalGiving').innerText = formatETB(totals.totalGiving);
            document.getElementById('totalExpenses').innerText = formatETB(totals.totalExpenses);
            document.getElementById('totalBorrowed').innerText = formatETB(totals.totalBorrowed);
            document.getElementById('netBalance').innerText = formatETB(totals.netBalance);
            document.getElementById('outstandingLoans').innerText = formatETB(totals.outstandingLoans);
            document.getElementById('monthlyContributionTotal').innerText = formatETB(totals.monthlyContributionTotal);
            document.getElementById('totalMembers').innerText = members.length;
            renderSaturdaySummary();
            renderFinanceCharts(totals);
            renderReports(totals);
        }

        function loadData() { normalizeFinanceCollections(); populateMemberSelects(); setFinanceDefaults(); renderMembers(document.getElementById('memberSearch').value.toLowerCase()); renderServices(); renderFinanceLists(); renderTotals(); renderSettings(); }

        function formatBytes(bytes) { if (!bytes) return '0 KB'; if (bytes < 1024) return bytes + ' B'; if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'; return (bytes / (1024 * 1024)).toFixed(2) + ' MB'; }
        function formatDateTime(value) { if (!value) return 'Not yet'; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(appSettings.locale || 'en-ET', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
        function calculateStorageUsage() { let total = 0; for (let i = 0; i < localStorage.length; i += 1) { const key = localStorage.key(i) || ''; const value = localStorage.getItem(key) || ''; total += key.length + value.length; } return total * 2; }
        function setSettingsMessage(id, text, isError) { const element = document.getElementById(id); if (!element) return; element.textContent = text || ''; element.classList.toggle('error', !!isError); }
        function updateFontScalePreview() { const value = document.getElementById('settingsFontScale').value; const label = document.getElementById('settingsFontScaleValue'); if (label) label.textContent = value + '%'; }

        async function refreshSecurityData() {
            if (!appRuntime.apiEnabled || !currentUser || !isAdminUser()) {
                accessUsers = [];
                auditLogs = [];
                editingAccessUserId = null;
                return;
            }
            try {
                const [usersPayload, auditPayload] = await Promise.all([
                    apiRequest('/users'),
                    apiRequest('/audit-logs')
                ]);
                accessUsers = usersPayload.users || [];
                auditLogs = auditPayload.logs || [];
            } catch (error) {
                console.error('Failed to refresh security data.', error);
                setSettingsMessage('accessSettingsMessage', error.message || 'Unable to load team access data.', true);
            }
        }

        function resetAccessUserForm() {
            editingAccessUserId = null;
            document.getElementById('accessDisplayName').value = '';
            document.getElementById('accessUsername').value = '';
            document.getElementById('accessRole').value = 'Finance';
            document.getElementById('accessPassword').value = '';
            document.getElementById('accessSubmitBtn').textContent = 'Add User';
            document.getElementById('accessCancelBtn').style.display = 'none';
            setSettingsMessage('accessSettingsMessage', '', false);
        }

        function renderAuditLogs() {
            const container = document.getElementById('auditLogList');
            if (!container) return;
            if (!currentUser) {
                container.innerHTML = '<div class="audit-log-item"><strong>Login required</strong><p>Sign in to see the church system audit timeline.</p></div>';
                return;
            }
            if (!isAdminUser()) {
                container.innerHTML = '<div class="audit-log-item"><strong>Admin only</strong><p>Audit history is available to administrators for accountability and review.</p></div>';
                return;
            }
            if (!auditLogs.length) {
                container.innerHTML = '<div class="audit-log-item"><strong>No entries yet</strong><p>User sign-ins and system changes will start appearing here as the team uses the app.</p></div>';
                return;
            }
            container.innerHTML = auditLogs.map((entry) => `
                <div class="audit-log-item">
                    <strong>${escapeHtml(entry.action || 'System update')}</strong>
                    <div class="audit-log-meta">${escapeHtml(entry.actorName || 'System')} • ${escapeHtml(formatDateTime(entry.createdAt))}</div>
                    <p>${escapeHtml(entry.details || 'No extra details were recorded.')}</p>
                </div>
            `).join('');
        }

        function renderAccessUsers() {
            const container = document.getElementById('settingsUserList');
            const help = document.getElementById('accessRoleHelp');
            if (!container || !help) return;
            if (!currentUser) {
                container.innerHTML = '<div class="settings-user-item"><div><div class="settings-user-title">Login required</div><div class="settings-user-meta">Sign in first to manage account access.</div></div></div>';
                help.textContent = 'Sign in to manage users and role-based access.';
                return;
            }
            if (!isAdminUser()) {
                container.innerHTML = `
                    <div class="settings-user-item">
                        <div>
                            <div class="settings-user-title">${escapeHtml(currentUser.name || currentUser.username)}<span class="settings-user-role ${getRoleClass(currentUser.role)}">${escapeHtml(currentUser.role || 'Viewer')}</span></div>
                            <div class="settings-user-meta">You are signed in as @${escapeHtml(currentUser.username || '')}. Only admins can add or remove users.</div>
                        </div>
                    </div>
                `;
                help.textContent = 'Your role controls which sections are visible in the system.';
                return;
            }
            help.textContent = 'Admins can manage users and settings. Finance can focus on finance and reports. Secretary can manage members and services. Viewer is read-only.';
            if (!accessUsers.length) {
                container.innerHTML = '<div class="settings-user-item"><div><div class="settings-user-title">No extra users yet</div><div class="settings-user-meta">Create team access accounts here for finance, secretary, or viewing roles.</div></div></div>';
                return;
            }
            container.innerHTML = accessUsers.map((user) => `
                <div class="settings-user-item">
                    <div>
                        <div class="settings-user-title">${escapeHtml(user.name || user.username)}<span class="settings-user-role ${getRoleClass(user.role)}">${escapeHtml(user.role || 'Viewer')}</span></div>
                        <div class="settings-user-meta">@${escapeHtml(user.username)} • ${user.active ? 'Active' : 'Inactive'}${user.lastLoginAt ? ` • Last login ${escapeHtml(formatDateTime(user.lastLoginAt))}` : ''}</div>
                    </div>
                    <div class="settings-user-actions">
                        <button type="button" onclick="editAccessUser('${escapeHtml(user.id)}')">Edit</button>
                        <button type="button" class="danger-btn" onclick="deleteAccessUser('${escapeHtml(user.id)}')">Delete</button>
                    </div>
                </div>
            `).join('');
        }

        function renderSettings() {
            const orgNameInput = document.getElementById('settingsOrgName');
            if (!orgNameInput) return;
            const storageText = formatBytes(calculateStorageUsage());
            orgNameInput.value = appSettings.organizationName;
            document.getElementById('settingsChurchName').value = appSettings.churchName;
            document.getElementById('settingsLocale').value = appSettings.locale;
            document.getElementById('settingsTheme').value = appSettings.theme;
            document.getElementById('settingsFontScale').value = appSettings.fontScale;
            document.getElementById('settingsReducedMotion').checked = !!appSettings.reducedMotion;
            document.getElementById('settingsAccountName').value = currentUser && currentUser.name ? currentUser.name : '';
            document.getElementById('settingsNewUsername').placeholder = currentUser && currentUser.username ? currentUser.username : appSettings.adminUsername;
            document.getElementById('settingsOrgPreview').textContent = appSettings.organizationName;
            document.getElementById('settingsPreviewText').textContent = appSettings.churchName + ' | Manage branding, security, appearance, and ' + (appRuntime.apiEnabled ? 'server-synced data' : 'local backups') + ' for this device.';
            document.getElementById('settingsThemeChip').textContent = 'Theme: ' + (appSettings.theme === 'dark' ? 'Dark' : 'Light');
            document.getElementById('settingsStorageChip').textContent = 'Storage: ' + storageText;
            document.getElementById('settingsStatusMembers').textContent = members.length;
            document.getElementById('settingsStatusActivities').textContent = activities.length;
            document.getElementById('settingsStatusIncome').textContent = incomes.length;
            document.getElementById('settingsStatusExpenses').textContent = expenses.length;
            document.getElementById('settingsStatusBorrowings').textContent = borrowings.length;
            document.getElementById('settingsStatusContributions').textContent = contributions.length;
            document.getElementById('settingsStatusCurrentUser').textContent = getUserDisplayName(currentUser);
            document.getElementById('settingsStatusCurrentRole').textContent = currentUser ? currentUser.role : 'Guest';
            document.getElementById('settingsStatusUsername').textContent = appSettings.adminUsername;
            document.getElementById('settingsStatusTheme').textContent = appSettings.theme === 'dark' ? 'Dark' : 'Light';
            document.getElementById('settingsStatusLocale').textContent = appSettings.locale;
            document.getElementById('settingsStatusFontScale').textContent = appSettings.fontScale + '%';
            document.getElementById('settingsStatusDataSource').textContent = appRuntime.dataSource + (appRuntime.syncing ? ' (Syncing...)' : '');
            document.getElementById('settingsStatusApi').textContent = appRuntime.apiStatus;
            document.getElementById('settingsStatusBackup').textContent = formatDateTime(appSettings.lastBackupAt);
            document.getElementById('settingsStatusStorage').textContent = storageText;
            document.getElementById('accessSubmitBtn').disabled = !isAdminUser();
            document.getElementById('accessPassword').disabled = !isAdminUser();
            document.getElementById('accessDisplayName').disabled = !isAdminUser();
            document.getElementById('accessUsername').disabled = !isAdminUser();
            document.getElementById('accessRole').disabled = !isAdminUser();
            document.getElementById('accessCancelBtn').style.display = editingAccessUserId && isAdminUser() ? 'inline-flex' : 'none';
            updateFontScalePreview();
            renderAccessUsers();
            renderAuditLogs();
        }

        function saveGeneralSettings() {
            const organizationName = document.getElementById('settingsOrgName').value.trim();
            const churchName = document.getElementById('settingsChurchName').value.trim();
            const locale = document.getElementById('settingsLocale').value;
            if (!organizationName || !churchName) { setSettingsMessage('generalSettingsMessage', 'System name and church name are required.', true); return; }
            appSettings.organizationName = organizationName;
            appSettings.churchName = churchName;
            appSettings.locale = locale;
            persistAppSettings();
            applySavedTheme();
            loadData();
            setSettingsMessage('generalSettingsMessage', 'Organization settings saved.', false);
        }

        function toggleSettingsPasswordVisibility() {
            const show = document.getElementById('settingsShowPasswords').checked;
            ['settingsCurrentPassword', 'settingsNewPassword', 'settingsConfirmPassword'].forEach((id) => { const field = document.getElementById(id); if (field) field.type = show ? 'text' : 'password'; });
        }

        async function saveSecuritySettings() {
            const currentPassword = document.getElementById('settingsCurrentPassword').value;
            const newUsername = (document.getElementById('settingsNewUsername').value.trim() || (currentUser && currentUser.username) || appSettings.adminUsername);
            const accountName = (document.getElementById('settingsAccountName').value.trim() || (currentUser && currentUser.name) || newUsername);
            const newPassword = document.getElementById('settingsNewPassword').value;
            const confirmPassword = document.getElementById('settingsConfirmPassword').value;
            if (!currentUser) { setSettingsMessage('securitySettingsMessage', 'Login first to update account settings.', true); return; }
            if (!currentPassword) { setSettingsMessage('securitySettingsMessage', 'Enter your current password first.', true); return; }
            if (!newUsername) { setSettingsMessage('securitySettingsMessage', 'Username cannot be empty.', true); return; }
            if (newPassword && newPassword !== confirmPassword) { setSettingsMessage('securitySettingsMessage', 'New password and confirmation do not match.', true); return; }

            if (appRuntime.apiEnabled) {
                try {
                    const result = await apiRequest('/auth/account', {
                        method: 'PUT',
                        body: JSON.stringify({
                            currentPassword,
                            username: newUsername,
                            name: accountName,
                            newPassword
                        })
                    });
                    currentUser = result.user || currentUser;
                    if (result.appSettings) {
                        appSettings = normalizeAppSettings(result.appSettings, appSettings);
                        persistAppSettings();
                    }
                    await refreshSecurityData();
                    applySavedTheme();
                    document.getElementById('settingsCurrentPassword').value = '';
                    document.getElementById('settingsNewUsername').value = '';
                    document.getElementById('settingsNewPassword').value = '';
                    document.getElementById('settingsConfirmPassword').value = '';
                    document.getElementById('loginUser').value = currentUser.username || appSettings.adminUsername;
                    renderSettings();
                    setSettingsMessage('securitySettingsMessage', result.message || 'Account updated successfully.', false);
                    return;
                } catch (error) {
                    setSettingsMessage('securitySettingsMessage', error.message || 'Unable to update account settings.', true);
                    return;
                }
            }

            if (currentPassword !== appSettings.adminPassword) { setSettingsMessage('securitySettingsMessage', 'Current password is incorrect.', true); return; }
            appSettings.adminUsername = newUsername;
            if (newPassword) { appSettings.adminPassword = newPassword; }
            if (currentUser) {
                currentUser = Object.assign({}, currentUser, { username: newUsername, name: accountName });
            }
            persistAppSettings();
            applySavedTheme();
            document.getElementById('settingsCurrentPassword').value = '';
            document.getElementById('settingsNewUsername').value = '';
            document.getElementById('settingsNewPassword').value = '';
            document.getElementById('settingsConfirmPassword').value = '';
            document.getElementById('loginUser').value = appSettings.adminUsername;
            renderSettings();
            setSettingsMessage('securitySettingsMessage', 'Login credentials updated.', false);
        }

        function editAccessUser(userId) {
            const user = accessUsers.find((entry) => entry.id === userId);
            if (!user || !isAdminUser()) return;
            editingAccessUserId = userId;
            document.getElementById('accessDisplayName').value = user.name || '';
            document.getElementById('accessUsername').value = user.username || '';
            document.getElementById('accessRole').value = user.role || 'Viewer';
            document.getElementById('accessPassword').value = '';
            document.getElementById('accessSubmitBtn').textContent = 'Update User';
            document.getElementById('accessCancelBtn').style.display = 'inline-flex';
            setSettingsMessage('accessSettingsMessage', 'Editing team access account.', false);
        }

        async function saveAccessUser() {
            if (!isAdminUser()) { setSettingsMessage('accessSettingsMessage', 'Only admins can manage team access.', true); return; }
            const name = document.getElementById('accessDisplayName').value.trim();
            const username = document.getElementById('accessUsername').value.trim();
            const role = document.getElementById('accessRole').value;
            const password = document.getElementById('accessPassword').value;
            if (!name || !username) { setSettingsMessage('accessSettingsMessage', 'Enter a name and username first.', true); return; }
            if (!editingAccessUserId && password.length < 4) { setSettingsMessage('accessSettingsMessage', 'New users need a password of at least 4 characters.', true); return; }
            try {
                const path = editingAccessUserId ? `/users/${editingAccessUserId}` : '/users';
                const method = editingAccessUserId ? 'PUT' : 'POST';
                const result = await apiRequest(path, {
                    method,
                    body: JSON.stringify({
                        name,
                        username,
                        role,
                        password,
                        active: true
                    })
                });
                accessUsers = result.users || accessUsers;
                if (result.appSettings) {
                    appSettings = normalizeAppSettings(result.appSettings, appSettings);
                    persistAppSettings();
                }
                await refreshSecurityData();
                resetAccessUserForm();
                renderSettings();
                setSettingsMessage('accessSettingsMessage', result.message || 'Team access updated successfully.', false);
            } catch (error) {
                setSettingsMessage('accessSettingsMessage', error.message || 'Unable to save team access account.', true);
            }
        }

        async function deleteAccessUser(userId) {
            if (!isAdminUser()) { setSettingsMessage('accessSettingsMessage', 'Only admins can delete team access accounts.', true); return; }
            if (!confirm('Delete this team access account?')) return;
            try {
                const result = await apiRequest(`/users/${userId}`, { method: 'DELETE' });
                accessUsers = result.users || accessUsers;
                await refreshSecurityData();
                if (editingAccessUserId === userId) resetAccessUserForm();
                renderSettings();
                setSettingsMessage('accessSettingsMessage', result.message || 'Team access account deleted.', false);
            } catch (error) {
                setSettingsMessage('accessSettingsMessage', error.message || 'Unable to delete this account.', true);
            }
        }

        function saveAppearanceSettings() {
            appSettings.theme = document.getElementById('settingsTheme').value;
            appSettings.fontScale = Number(document.getElementById('settingsFontScale').value);
            appSettings.reducedMotion = document.getElementById('settingsReducedMotion').checked;
            persistAppSettings();
            applySavedTheme();
            loadData();
            setSettingsMessage('appearanceSettingsMessage', 'Appearance updated.', false);
        }

        function resetAppearanceSettings() {
            appSettings.theme = DEFAULT_APP_SETTINGS.theme;
            appSettings.fontScale = DEFAULT_APP_SETTINGS.fontScale;
            appSettings.reducedMotion = DEFAULT_APP_SETTINGS.reducedMotion;
            persistAppSettings();
            applySavedTheme();
            loadData();
            setSettingsMessage('appearanceSettingsMessage', 'Appearance reset to defaults.', false);
        }

        function openImportPicker() { document.getElementById('importFile').click(); }
        function openRestorePicker() { document.getElementById('restoreFile').click(); }

        function resetDataSection(section) {
            const labels = { activities: 'activities', finances: 'financial records', members: 'members', all: 'all saved data except settings' };
            if (!confirm('Are you sure you want to reset ' + labels[section] + '?')) return;
            if (section === 'activities') { activityCategories = [...DEFAULT_ACTIVITY_CATEGORIES]; activities = []; resetActivityForm(); }
            if (section === 'finances') { incomes = []; expenses = []; borrowings = []; contributions = []; }
            if (section === 'members') { members = []; }
            if (section === 'all') { members = []; incomes = []; expenses = []; borrowings = []; contributions = []; activityCategories = [...DEFAULT_ACTIVITY_CATEGORIES]; activities = []; resetActivityForm(); }
            if (section === 'members' || section === 'all') { resetMemberForm(); }
            persistData();
            loadData();
            setSettingsMessage('dataSettingsMessage', 'Data reset completed for ' + labels[section] + '.', false);
        }

        function updateBackupTimestamp() { appSettings.lastBackupAt = new Date().toISOString(); persistAppSettings(); renderSettings(); }

        let incomeChartObj, expenseChartObj, borrowChartObj, contributionChartObj, reportFinanceChartObj, reportRoleChartObj, reportActivityChartObj;
        function renderFinanceCharts(totals) {
            if (typeof Chart === 'undefined') return;
            const isDark = document.body.classList.contains('dark-mode');
            const labelColor = isDark ? '#e2e8f0' : '#334155';
            const gridColor = isDark ? 'rgba(226,232,240,0.12)' : 'rgba(51,65,85,0.1)';
            const legendColor = isDark ? '#f8fafc' : '#0f172a';

            if (incomeChartObj) incomeChartObj.destroy();
            const incomeCanvas = document.getElementById('incomeChart');
            if (incomeCanvas) {
                const incomeValues = [totals.cogContributionTotal, totals.offeringTotal, totals.titheTotal, totals.otherIncomeTotal];
                const hasIncomeData = incomeValues.some((value) => value > 0);
                incomeChartObj = new Chart(incomeCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: hasIncomeData ? ['COG Contribution', 'Offering', 'Tithe', 'Other Income'] : ['No records'],
                        datasets: [{
                            data: hasIncomeData ? incomeValues : [1],
                            backgroundColor: hasIncomeData ? ['#2563eb', '#16a34a', '#0f766e', '#f59e0b'] : ['#cbd5e1'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 12 } },
                            tooltip: { callbacks: { label: (context) => hasIncomeData ? `${context.label}: ${formatETB(context.parsed)}` : 'No income records yet' } }
                        }
                    }
                });
            }

            if (expenseChartObj) expenseChartObj.destroy();
            const expenseCanvas = document.getElementById('expenseChart');
            if (expenseCanvas) {
                expenseChartObj = new Chart(expenseCanvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Income', 'Contributions', 'Expenses', 'Net'],
                        datasets: [{
                            data: [totals.totalGiving, totals.monthlyContributionTotal, totals.totalExpenses, totals.netBalance],
                            backgroundColor: ['#2563eb', '#16a34a', '#dc2626', '#7c3aed'],
                            borderRadius: 14
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (context) => formatETB(context.parsed.y) } }
                        },
                        scales: {
                            x: { ticks: { color: labelColor }, grid: { display: false } },
                            y: { ticks: { color: labelColor, callback: (value) => formatETB(value) }, grid: { color: gridColor } }
                        }
                    }
                });
            }

            if (borrowChartObj) borrowChartObj.destroy();
            const borrowCanvas = document.getElementById('borrowChart');
            if (borrowCanvas) {
                const borrowValues = [totals.outstandingLoans, totals.paidLoansTotal];
                const hasBorrowData = borrowValues.some((value) => value > 0);
                borrowChartObj = new Chart(borrowCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: hasBorrowData ? ['Outstanding', 'Paid Back'] : ['No loans'],
                        datasets: [{
                            data: hasBorrowData ? borrowValues : [1],
                            backgroundColor: hasBorrowData ? ['#f97316', '#22c55e'] : ['#cbd5e1'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { position: 'bottom', labels: { color: legendColor, boxWidth: 12 } },
                            tooltip: { callbacks: { label: (context) => hasBorrowData ? `${context.label}: ${formatETB(context.parsed)}` : 'No borrowing records yet' } }
                        }
                    }
                });
            }

            if (contributionChartObj) contributionChartObj.destroy();
            const contributionCanvas = document.getElementById('contributionChart');
            if (contributionCanvas) {
                const contributionBuckets = {};
                contributions.forEach((item) => { contributionBuckets[item.month] = (contributionBuckets[item.month] || 0) + Number(item.amount || 0); });
                const contributionEntries = Object.entries(contributionBuckets).sort((left, right) => left[0].localeCompare(right[0])).slice(-6);
                const hasContributionData = contributionEntries.length > 0;
                contributionChartObj = new Chart(contributionCanvas.getContext('2d'), {
                    type: 'line',
                    data: {
                        labels: hasContributionData ? contributionEntries.map(([month]) => month) : ['No data'],
                        datasets: [{
                            data: hasContributionData ? contributionEntries.map(([, amount]) => amount) : [0],
                            borderColor: '#16a34a',
                            backgroundColor: 'rgba(22,163,74,0.18)',
                            fill: true,
                            tension: 0.35,
                            pointRadius: 4,
                            pointBackgroundColor: '#16a34a'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (context) => formatETB(context.parsed.y) } }
                        },
                        scales: {
                            x: { ticks: { color: labelColor }, grid: { color: gridColor } },
                            y: { ticks: { color: labelColor, callback: (value) => formatETB(value) }, grid: { color: gridColor } }
                        }
                    }
                });
            }
        }

        function renderReportCharts(snapshot, totals) {
            if (typeof Chart === 'undefined') return;
            const isDark = document.body.classList.contains('dark-mode');
            const labelColor = isDark ? '#e2e8f0' : '#334155';
            const gridColor = isDark ? 'rgba(226,232,240,0.12)' : 'rgba(51,65,85,0.1)';

            if (reportFinanceChartObj) reportFinanceChartObj.destroy();
            const financeCanvas = document.getElementById('reportFinanceChart');
            if (financeCanvas) {
                reportFinanceChartObj = new Chart(financeCanvas.getContext('2d'), {
                    type: 'bar',
                    data: {
                        labels: ['Giving', 'Contributions', 'Expenses', 'Net Balance'],
                        datasets: [{
                            data: [totals.totalGiving, totals.monthlyContributionTotal, totals.totalExpenses, totals.netBalance],
                            backgroundColor: ['#2563eb', '#16a34a', '#dc2626', '#0f766e'],
                            borderRadius: 14
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: { callbacks: { label: (context) => formatETB(context.parsed.y) } }
                        },
                        scales: {
                            x: { ticks: { color: labelColor }, grid: { display: false } },
                            y: { ticks: { color: labelColor, callback: (value) => formatETB(value) }, grid: { color: gridColor } }
                        }
                    }
                });
            }

            if (reportRoleChartObj) reportRoleChartObj.destroy();
            const roleCanvas = document.getElementById('reportRoleChart');
            if (roleCanvas) {
                const roleEntries = Object.entries(snapshot.roleCounts);
                reportRoleChartObj = new Chart(roleCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: roleEntries.length ? roleEntries.map((entry) => entry[0]) : ['No members'],
                        datasets: [{
                            data: roleEntries.length ? roleEntries.map((entry) => entry[1]) : [1],
                            backgroundColor: roleEntries.length ? ['#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#0f766e'] : ['#94a3b8'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { color: labelColor } } }
                    }
                });
            }

            if (reportActivityChartObj) reportActivityChartObj.destroy();
            const activityCanvas = document.getElementById('reportActivityChart');
            if (activityCanvas) {
                const activityValues = ACTIVITY_STATUS_OPTIONS.map((status) => snapshot.activityStatusCounts[status] || 0);
                const hasActivityData = activityValues.some((value) => value > 0);
                reportActivityChartObj = new Chart(activityCanvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: hasActivityData ? ACTIVITY_STATUS_OPTIONS : ['No activities'],
                        datasets: [{
                            data: hasActivityData ? activityValues : [1],
                            backgroundColor: hasActivityData ? ['#2563eb', '#16a34a', '#94a3b8'] : ['#94a3b8'],
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: 'bottom', labels: { color: labelColor } } }
                    }
                });
            }
        }

        function downloadReportSnapshot() {
            const totals = getFinancialTotals();
            const snapshot = buildReportSnapshot(totals);
            const payload = {
                generatedAt: snapshot.generatedAt,
                churchName: appSettings.churchName,
                locale: appSettings.locale,
                totals,
                counts: {
                    members: members.length,
                    activities: activities.length,
                    featuredActivities: snapshot.featuredActivities.length,
                    categories: activityCategories.length
                },
                roles: snapshot.roleCounts,
                activityStatus: snapshot.activityStatusCounts,
                categories: snapshot.categoryCounts,
                highlights: snapshot.highlights,
                timeline: snapshot.timeline
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'COG_Report_' + new Date().toISOString().split('T')[0] + '.json';
            link.click();
            URL.revokeObjectURL(url);
        }

        function printReport() {
            showSection('reports');
            window.setTimeout(() => window.print(), 120);
        }

        function isElementVisible(element) {
            return !!(element && getComputedStyle(element).display !== 'none' && getComputedStyle(element).visibility !== 'hidden');
        }

        function getActiveSectionId() {
            const section = document.querySelector('.section.active');
            return section ? section.id : '';
        }

        function clickFocusedInteractive(target) {
            const interactive = target.closest('button, [role="button"], .sidebar a');
            if (!interactive) return false;
            interactive.click();
            return true;
        }

        function triggerSectionEnterAction(target) {
            const activeSectionId = getActiveSectionId();
            const targetId = target.id || '';

            if (isElementVisible(document.getElementById('loginOverlay'))) {
                submitLoginMode();
                return true;
            }

            if (target.closest('.sidebar')) {
                target.closest('.sidebar a').click();
                return true;
            }

            if (activeSectionId === 'members') {
                if (targetId === 'memberSearch') { loadData(); return true; }
                if (isMemberFormVisible() && target.closest('#memberFormWrapper')) { addMember(); return true; }
                return false;
            }

            if (activeSectionId === 'services') {
                if (targetId === 'categoryInput') { addCategory(); return true; }
                if (['activityCategory', 'activityStatus', 'activityTitle', 'activityDate', 'activityTime', 'activityLeader', 'activityLocation', 'activityFeatured'].includes(targetId)) { saveActivity(); return true; }
                if (['activitySearch', 'activityFilterCategory', 'activityFilterStatus'].includes(targetId)) { renderServices(); return true; }
                return false;
            }

            if (activeSectionId === 'finances') {
                if (['incomeType', 'memberSelect', 'amount', 'incomeDate', 'incomeBookRef', 'note'].includes(targetId)) { addIncome(); return true; }
                if (['contributionMemberSelect', 'contributionAmount', 'contributionMonth'].includes(targetId)) { addMonthlyContribution(); return true; }
                if (['expenseName', 'expenseAmount', 'expenseDate'].includes(targetId)) { addExpense(); return true; }
                if (['borrowMemberSelect', 'borrowAmount', 'borrowNote', 'borrowDate'].includes(targetId)) { addBorrowing(); return true; }
                if (targetId === 'financeSaturdayDate') { renderSaturdaySummary(); return true; }
                return false;
            }

            if (activeSectionId === 'reports') {
                if (target.closest('.report-action-row')) { clickFocusedInteractive(target); return true; }
                return false;
            }

            if (activeSectionId === 'settings') {
                if (['settingsOrgName', 'settingsChurchName', 'settingsLocale'].includes(targetId)) { saveGeneralSettings(); return true; }
                if (['settingsAccountName', 'settingsCurrentPassword', 'settingsNewUsername', 'settingsNewPassword', 'settingsConfirmPassword'].includes(targetId)) { saveSecuritySettings(); return true; }
                if (['accessDisplayName', 'accessUsername', 'accessRole', 'accessPassword'].includes(targetId)) { saveAccessUser(); return true; }
                if (['settingsTheme', 'settingsFontScale', 'settingsReducedMotion'].includes(targetId)) { saveAppearanceSettings(); return true; }
                return false;
            }

            return false;
        }

        function handleGlobalEnterKey(event) {
            if (event.defaultPrevented || event.key !== 'Enter' || event.isComposing) return;
            const target = event.target;
            if (!target) return;

            if (target.tagName === 'TEXTAREA') {
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    triggerSectionEnterAction(target);
                }
                return;
            }

            if (clickFocusedInteractive(target)) {
                event.preventDefault();
                return;
            }

            if (triggerSectionEnterAction(target)) {
                event.preventDefault();
            }
        }

        function initializeKeyboardAccess() {
            document.querySelectorAll('.sidebar a').forEach((link) => {
                link.setAttribute('role', 'button');
                link.tabIndex = 0;
            });
        }

        function exportData() { updateBackupTimestamp(); const data = { members: members.map(normalizeMember), incomes: incomes.map(normalizeIncome), expenses: expenses.map(normalizeExpense), borrowings: borrowings.map(normalizeBorrowing), contributions: contributions.map(normalizeContribution), activityCategories: normalizeActivityCategories(activityCategories, activities), activities: activities.map(normalizeActivity), appSettings }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'COG_Backup.json'; link.click(); URL.revokeObjectURL(url); setSettingsMessage('dataSettingsMessage', 'Data exported successfully.', false); }
        function importData(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = function (e) { try { const data = JSON.parse(e.target.result); members = (data.members || []).map(normalizeMember); incomes = sortRecordsByDateDesc((data.incomes || []).map(normalizeIncome), 'date'); expenses = sortRecordsByDateDesc((data.expenses || []).map(normalizeExpense), 'date'); borrowings = sortRecordsByDateDesc((data.borrowings || []).map(normalizeBorrowing), 'date'); contributions = sortContributionsByMonthDesc((data.contributions || []).map(normalizeContribution)); activities = (data.activities || DEFAULT_ACTIVITIES).map(normalizeActivity); activityCategories = normalizeActivityCategories(data.activityCategories || DEFAULT_ACTIVITY_CATEGORIES, activities); appSettings = normalizeAppSettings(data.appSettings || appSettings); selectedActivityIndex = activities.length ? 0 : null; persistData(); persistAppSettings(); applySavedTheme(); resetMemberForm(); resetActivityForm(); loadData(); setSettingsMessage('dataSettingsMessage', 'Import completed successfully.', false); alert('Data Imported Successfully!'); } catch (error) { console.error(error); setSettingsMessage('dataSettingsMessage', 'Import failed. Please use a valid file.', true); alert('Invalid file'); } }; reader.readAsText(file); }
        function backupData() { updateBackupTimestamp(); const backup = { members: members.map(normalizeMember), incomes: incomes.map(normalizeIncome), expenses: expenses.map(normalizeExpense), borrowings: borrowings.map(normalizeBorrowing), contributions: contributions.map(normalizeContribution), activityCategories: normalizeActivityCategories(activityCategories, activities), activities: activities.map(normalizeActivity), appSettings, timestamp: new Date().toISOString() }; const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backup, null, 2)); const downloadAnchor = document.createElement('a'); downloadAnchor.setAttribute('href', dataStr); downloadAnchor.setAttribute('download', 'cog_backup_' + new Date().toISOString().split('T')[0] + '.json'); document.body.appendChild(downloadAnchor); downloadAnchor.click(); downloadAnchor.remove(); setSettingsMessage('dataSettingsMessage', 'Backup snapshot created.', false); alert('Backup completed successfully!'); }
        function restoreData(event) { const file = event.target.files[0]; if (!file) return alert('No file selected.'); const reader = new FileReader(); reader.onload = function (e) { try { const data = JSON.parse(e.target.result); members = (data.members || []).map(normalizeMember); incomes = sortRecordsByDateDesc((data.incomes || []).map(normalizeIncome), 'date'); expenses = sortRecordsByDateDesc((data.expenses || []).map(normalizeExpense), 'date'); borrowings = sortRecordsByDateDesc((data.borrowings || []).map(normalizeBorrowing), 'date'); contributions = sortContributionsByMonthDesc((data.contributions || []).map(normalizeContribution)); activities = (data.activities || DEFAULT_ACTIVITIES).map(normalizeActivity); activityCategories = normalizeActivityCategories(data.activityCategories || DEFAULT_ACTIVITY_CATEGORIES, activities); appSettings = normalizeAppSettings(data.appSettings || appSettings); selectedActivityIndex = activities.length ? 0 : null; persistData(); persistAppSettings(); applySavedTheme(); resetMemberForm(); resetActivityForm(); loadData(); setSettingsMessage('dataSettingsMessage', 'Backup restored successfully.', false); alert('Data restored successfully!'); } catch (error) { console.error(error); setSettingsMessage('dataSettingsMessage', 'Restore failed. Invalid backup format.', true); alert('Failed to restore data: Invalid file format.'); } }; reader.readAsText(file); }
        async function initializeApplication() {
            applySavedTheme();
            resetMemberForm();
            resetActivityForm();
            resetAccessUserForm();
            setMemberFormVisibility(false);
            await initializeAppData();
            await restoreSession();
            applySavedTheme();
            if (currentUser) {
                document.getElementById('loginOverlay').style.display = 'none';
                await refreshSecurityData();
            } else {
                document.getElementById('loginOverlay').style.display = 'flex';
            }
            loadData();
        }

        document.getElementById('memberSearch').addEventListener('input', loadData);
        document.getElementById('activitySearch').addEventListener('input', renderServices);
        document.getElementById('activityFilterCategory').addEventListener('change', renderServices);
        document.getElementById('activityFilterStatus').addEventListener('change', renderServices);
        document.getElementById('financeSaturdayDate').addEventListener('change', renderSaturdaySummary);
        document.getElementById('incomeType').addEventListener('change', function () { document.getElementById('memberSelect').value = getPreferredIncomeMember(this.value); syncIncomeMemberMode(); });
        document.getElementById('categoryInput').addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); addCategory(); } });
        ['loginUser', 'loginPass', 'loginConfirmPass'].forEach((id) => { document.getElementById(id).addEventListener('keydown', function (event) { if (event.key === 'Enter') { event.preventDefault(); submitLoginMode(); } }); });
        document.addEventListener('keydown', handleGlobalEnterKey);
        initializeKeyboardAccess();
        initializeApplication();

    