export const errorHandler = (err, request, response, next) => {

    response.header("Access-Control-Allow-Origin", "http://localhost:5173");
    response.header("Access-Control-Allow-Credentials", "true");

    const statusCode = response.statusCode || 500

    response.status(statusCode).json({
        message: err.message,
        stack: err.stack
    })
}