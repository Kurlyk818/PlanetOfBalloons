import jwt from 'jsonwebtoken';



export const createJWT = ({payload}) => {
    if (!process.env.JWT_SECRET || !process.env.JWT_LIFETIME) {
        throw new Error('Environment variables JWT_SECRET and JWT_LIFETIME must be defined');
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_LIFETIME
    });
    return token;
}


 export const isTokenValid = ({token}) => jwt.verify(token, process.env.JWT_SECRET);

 export const attachCookiesToResponse =  ({res, user}) => {
    const token = createJWT({payload: user})
    const oneDay = 1000 * 60 * 60 * 24;

    // Always use secure cookies in production and development
    res.cookie('token', token, {
        httpOnly: true,
        expires: new Date(Date.now() + oneDay),
        secure: true, // Always use secure cookies
        signed: true,
        sameSite: 'none', // Critical for cross-domain cookies in production
        path: '/', // Ensure cookie is available on all paths
    })

}