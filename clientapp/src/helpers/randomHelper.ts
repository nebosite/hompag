
const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
// Generate a random id that is based on time with a couple of random characters at the end
// to make collisions extremely unlikely
export const generateStringId = () => {
    let seed = Math.floor(Date.now());
    const charCount = chars.length;
    let output ="";
    output += chars[Math.floor(Math.random() * charCount)]
    output += chars[Math.floor(Math.random() * charCount)]
    for(let i = 0; i < 8; i++)
    {
        const letter = chars[seed % charCount]
        output = letter + output;
        seed = Math.floor(seed/charCount);
    }
    return output;
}