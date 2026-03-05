/**
 * Backend API Structure - Express.js Implementation Example
 * This file shows the structure of how endpoints should be organized
 */

const express = require('express');
const router = express.Router();

// ============================================
// 1. AUTHENTICATION ROUTES
// ============================================

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const { fullname, email, password, confirmPassword, terms } = req.body;
    
    // Validation
    if (!fullname || !email || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { general: 'Tất cả các trường là bắt buộc' }
      });
    }
    
    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { confirmPassword: 'Mật khẩu xác nhận không khớp' }
      });
    }
    
    if (!terms) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { terms: 'Bạn phải đồng ý với điều khoản' }
      });
    }
    
    // TODO: Check if email exists
    // TODO: Hash password
    // TODO: Create user in database
    
    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công!',
      data: {
        user: {
          id: 1,
          fullname,
          email,
          role: 'user',
          createdAt: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // TODO: Validate credentials
    // TODO: Generate JWT token
    
    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        token: 'jwt_token_here',
        refreshToken: 'refresh_token_here',
        user: {
          id: 1,
          fullname: 'Nguyễn Văn A',
          email,
          role: 'user',
          avatar: null
        }
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Email hoặc mật khẩu không đúng'
    });
  }
});

// POST /api/auth/forgot-password
router.post('/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // TODO: Check if email exists
    // TODO: Generate reset token
    // TODO: Send email with reset link
    
    res.json({
      success: true,
      message: 'Email đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra hộp thư của bạn.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Không thể gửi email. Vui lòng thử lại sau.'
    });
  }
});

// POST /api/auth/reset-password
router.post('/auth/reset-password', async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;
    
    // TODO: Validate token
    // TODO: Update password
    
    res.json({
      success: true,
      message: 'Mật khẩu đã được đặt lại thành công!'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn'
    });
  }
});

// POST /api/auth/logout
router.post('/auth/logout', authenticateToken, async (req, res) => {
  try {
    // TODO: Invalidate token
    
    res.json({
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 2. USER PROFILE ROUTES
// ============================================

// GET /api/users/me
router.get('/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // TODO: Fetch user from database
    
    res.json({
      success: true,
      data: {
        id: userId,
        fullname: 'Nguyễn Văn A',
        email: 'user@example.com',
        phone: '+84123456789',
        avatar: null,
        location: 'Hà Nội, Việt Nam',
        role: 'user',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: '2024-01-20T15:45:00Z'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/users/me
router.put('/users/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullname, phone, location } = req.body;
    
    // TODO: Update user in database
    
    res.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        id: userId,
        fullname,
        phone,
        location,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/users/me/avatar
router.post('/users/me/avatar', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user.id;
    
    // TODO: Upload image to storage
    // TODO: Update user avatar URL
    
    res.json({
      success: true,
      message: 'Upload ảnh đại diện thành công',
      data: {
        avatar: 'https://example.com/uploads/avatar_123.jpg'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 3. TASKS ROUTES
// ============================================

// GET /api/tasks
router.get('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, completed } = req.query;
    
    // TODO: Fetch tasks from database
    // TODO: Apply filters
    
    res.json({
      success: true,
      data: [
        {
          id: 1,
          text: 'Gửi email báo cáo cho khách hàng A',
          description: null,
          completed: true,
          priority: 'high',
          tags: ['Routine'],
          dueDate: date || '2024-01-20',
          reminderTime: '14:00',
          createdAt: '2024-01-20T08:00:00Z',
          updatedAt: '2024-01-20T14:00:00Z'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/tasks
router.post('/tasks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text, description, dueDate, reminderTime, priority, tags } = req.body;
    
    // Validation
    if (!text) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { text: 'Tên nhiệm vụ là bắt buộc' }
      });
    }
    
    // TODO: Create task in database
    
    res.status(201).json({
      success: true,
      message: 'Tạo nhiệm vụ thành công',
      data: {
        id: Date.now(),
        text,
        description,
        completed: false,
        priority,
        tags: tags || [],
        dueDate,
        reminderTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/tasks/:id
router.put('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    const updates = req.body;
    
    // TODO: Verify task belongs to user
    // TODO: Update task in database
    
    res.json({
      success: true,
      message: 'Cập nhật nhiệm vụ thành công',
      data: {
        id: parseInt(taskId),
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    // TODO: Verify task belongs to user
    // TODO: Delete task from database
    
    res.json({
      success: true,
      message: 'Xóa nhiệm vụ thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PATCH /api/tasks/:id/toggle
router.patch('/tasks/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const taskId = req.params.id;
    
    // TODO: Toggle task completion status
    
    res.json({
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: {
        id: parseInt(taskId),
        completed: true,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 4. GOALS ROUTES
// ============================================

// GET /api/goals
router.get('/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, page = 1, limit = 10 } = req.query;
    
    // TODO: Fetch goals from database with pagination
    // TODO: Calculate stats
    
    res.json({
      success: true,
      data: {
        goals: [
          {
            id: 1,
            title: 'Học React Native',
            category: 'Kỹ năng',
            dueDate: '2024-12-31',
            progress: 40,
            icon: 'code',
            status: 'active',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-20T10:00:00Z'
          }
        ],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 3,
          totalPages: 1
        },
        stats: {
          active: 3,
          completed: 0,
          averageProgress: 45
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/goals/:id
router.get('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    
    // TODO: Fetch goal with milestones and tasks
    
    res.json({
      success: true,
      data: {
        id: parseInt(goalId),
        title: 'Học React Native',
        category: 'Kỹ năng',
        dueDate: '2024-12-31',
        progress: 40,
        icon: 'code',
        status: 'active',
        description: 'Mô tả mục tiêu',
        milestones: [],
        tasks: []
      }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Mục tiêu không tồn tại'
    });
  }
});

// POST /api/goals
router.post('/goals', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, category, dueDate, icon, description } = req.body;
    
    // Validation
    if (!title || !category) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { general: 'Tên mục tiêu và danh mục là bắt buộc' }
      });
    }
    
    // TODO: Create goal in database
    
    res.status(201).json({
      success: true,
      message: 'Tạo mục tiêu thành công',
      data: {
        id: Date.now(),
        title,
        category,
        dueDate,
        progress: 0,
        icon: icon || 'flag',
        status: 'active',
        description,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/goals/:id
router.put('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    const updates = req.body;
    
    // TODO: Verify goal belongs to user
    // TODO: Update goal in database
    
    res.json({
      success: true,
      message: 'Cập nhật mục tiêu thành công',
      data: {
        id: parseInt(goalId),
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/goals/:id
router.delete('/goals/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const goalId = req.params.id;
    
    // TODO: Verify goal belongs to user
    // TODO: Delete goal from database
    
    res.json({
      success: true,
      message: 'Xóa mục tiêu thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 5. EVENTS ROUTES
// ============================================

// GET /api/events
router.get('/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, month, week } = req.query;
    
    // TODO: Fetch events from database based on date range
    
    res.json({
      success: true,
      data: [
        {
          id: 1,
          title: 'Review thiết kế UI',
          date: '2024-01-22',
          timeFrom: '09:00',
          timeTo: '10:00',
          color: 'green',
          allDay: false,
          locationType: 'online',
          platform: 'google-meet',
          address: null,
          createdAt: '2024-01-20T08:00:00Z',
          updatedAt: '2024-01-20T08:00:00Z'
        }
      ]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// POST /api/events
router.post('/events', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, date, timeFrom, timeTo, color, allDay, locationType, platform, address } = req.body;
    
    // Validation
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { general: 'Tiêu đề và ngày là bắt buộc' }
      });
    }
    
    // TODO: Create event in database
    
    res.status(201).json({
      success: true,
      message: 'Tạo sự kiện thành công',
      data: {
        id: Date.now(),
        title,
        date,
        timeFrom,
        timeTo,
        color: color || 'green',
        allDay: allDay || false,
        locationType,
        platform,
        address,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PUT /api/events/:id
router.put('/events/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    const updates = req.body;
    
    // TODO: Verify event belongs to user
    // TODO: Update event in database
    
    res.json({
      success: true,
      message: 'Cập nhật sự kiện thành công',
      data: {
        id: parseInt(eventId),
        ...updates,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// DELETE /api/events/:id
router.delete('/events/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const eventId = req.params.id;
    
    // TODO: Verify event belongs to user
    // TODO: Delete event from database
    
    res.json({
      success: true,
      message: 'Xóa sự kiện thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 6. NOTIFICATIONS ROUTES
// ============================================

// GET /api/notifications
router.get('/notifications', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { unread, type, page = 1, limit = 20 } = req.query;
    
    // TODO: Fetch notifications from database
    
    res.json({
      success: true,
      data: {
        notifications: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        },
        unreadCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/notifications/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // TODO: Mark notification as read
    
    res.json({
      success: true,
      message: 'Đánh dấu đã đọc thành công',
      data: {
        id: parseInt(notificationId),
        unread: false,
        updatedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 7. CONTACT ROUTES
// ============================================

// POST /api/contact
router.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    
    // Validation
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: { general: 'Tất cả các trường là bắt buộc' }
      });
    }
    
    // TODO: Save contact form to database
    // TODO: Send email notification
    
    res.json({
      success: true,
      message: 'Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi trong thời gian sớm nhất.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// 8. ADMIN ROUTES
// ============================================

// GET /api/admin/dashboard/stats
router.get('/admin/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // TODO: Fetch dashboard statistics
    
    res.json({
      success: true,
      data: {
        totalUsers: 12450,
        activeUsersToday: 1203,
        goalsCreated: 3200,
        averageCompletionRate: 85,
        userGrowth: [],
        goalCategories: [],
        recentActivity: []
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/admin/users
router.get('/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, role, dateRange, sort, page = 1, limit = 10, search } = req.query;
    
    // TODO: Fetch users with filters and pagination
    
    res.json({
      success: true,
      data: {
        users: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        },
        stats: {
          total: 0,
          active: 0,
          pending: 0,
          banned: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// ============================================
// MIDDLEWARE FUNCTIONS
// ============================================

// Authentication middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Please login.'
    });
  }
  
  // TODO: Verify JWT token
  // TODO: Attach user to request
  
  req.user = { id: 1 }; // Placeholder
  next();
}

// Admin authorization middleware
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'You don\'t have permission to access this resource.'
    });
  }
  next();
}

// File upload middleware (using multer)
const multer = require('multer');
const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, and GIF are allowed.'));
    }
  }
});

module.exports = router;

