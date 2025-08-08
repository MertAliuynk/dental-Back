const customErrorHandler = (err, req, res, next) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error('Unexpected error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'An unexpected error occurred. Please try again later.',
  });
}
module.exports = customErrorHandler;