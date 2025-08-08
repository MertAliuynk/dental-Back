const asyncErrorWrapper = require("express-async-handler");
const { executeQuery } = require('../helpers/db/utils/queryExecutor');
const CustomError = require('../helpers/err/CustomError');
const logger = require('../helpers/logger');
const userQueries = require('../helpers/db/queries/userQueries');
const { validateUserInput, comparePassword } = require('../helpers/input/inputhelpers');
const { generateToken } = require('../helpers/auth/jwtHelper');

const getUserById = asyncErrorWrapper(async (req, res, next) => {
    const userId = req.params.id;
    const user = await userQueries.getUserById(userId);

    if (!user) {
        return next(new CustomError('User not found', 404));
    }

    res.status(200).json({
        success: true,
        data: user
    });
});
const Register = asyncErrorWrapper(async (req, res, next) => {
    const { username, password, role, branchId, firstName, lastName } = req.body;

    // Validate input
    if (!username || !password || !role || !branchId || !firstName || !lastName) {
        return next(new CustomError('Tüm alanları doldurun', 400));
    }

    // Check if user already exists
    const existingUser = await userQueries.getUserByUsername(username);
    if (existingUser) {
        return next(new CustomError('User already exists', 409));
    }

    // Create new user
    const newUser = await userQueries.createUser({ username, password, role, branchId, firstName, lastName });
    if (!newUser) {
        return next(new CustomError('User registration failed', 500));
    }
    res.status(201).json({
        success: true,
        data: newUser
    });
});
const login = asyncErrorWrapper(async (req, res, next) => {
    const { username, password } = req.body; 
    if(!validateUserInput(username,password)){
        return next(new CustomError("lütfen bilgilerinizi giriniz",400));
    }
    const user = await userQueries.getUserByUsername(username);
    if (!user) {
        return next(new CustomError('User not found', 404));
    }
    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
        return next(new CustomError('Invalid password', 401));
    }
    
    // Şube bilgisini de getir
    let branchName = null;
    if (user.branch_id) {
        const branchQuery = 'SELECT name FROM branches WHERE branch_id = $1';
        const branchResult = await executeQuery(branchQuery, [user.branch_id], { returnSingle: true });
        branchName = branchResult?.name || null;
    }
    
    // JWT oluştur
    const token = generateToken({
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        branch_id: user.branch_id // Branch ID'yi JWT'ye ekle
    });
    // Tokeni httpOnly ve secure cookie olarak gönder
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 // 1 gün
    });
    res.status(200).json({
        success: true,
        token: token, // Token'ı da response'a ekleyelim
        user: {
            user_id: user.user_id,
            username: user.username,
            role: user.role,
            branch_id: user.branch_id, // Branch ID eklendi
            branch_name: branchName, // Branch adı eklendi
            first_name: user.first_name,
            last_name: user.last_name
        }
    });
});
module.exports = {getUserById, Register, login};