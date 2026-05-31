const bcrypt = require('bcryptjs');
const hash = '$2a$10$DFI3OVzYRnz9DGD/wJXSkO4RrGiH7h1XFLJWuc0CgrbQB17s1bqma';
bcrypt.compare('test1234', hash).then(console.log);
