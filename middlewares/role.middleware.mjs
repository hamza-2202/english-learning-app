export const roleMiddleware = (allowedRoles) => {
    return (request, response, next) => {
        try {
            if (!allowedRoles.includes(request.user.role.toString())) {
                response.status(403)
                throw new Error(`Access denied. ${request.user.role} role is not authorized`)
            }
            next()
        } catch (err) {
            response.status(403).json({
                message: err.message,
                error: `Something went wrong`
            })
        }
    }
}