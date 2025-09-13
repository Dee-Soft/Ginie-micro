
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |


## Reporting a Vulnerability

We take the security of ginie-micro seriously. If you believe you've found a security vulnerability, please follow these steps:

### Private Disclosure Process

1. **Do not** create a public GitHub issue for security vulnerabilities
2. Email security reports to: dee.soft.au@gmail.com
3. Include detailed information about the vulnerability
4. Provide steps to reproduce the issue
5. Include any proof-of-concept code or examples

### Response Timeline

- **Within 48 hours**: Initial response to your report
- **Within 7 days**: Vulnerability assessment and update
- **Within 30 days**: Fix implementation or workaround provided

### Scope

The following are considered in scope for security reporting:

- Remote code execution vulnerabilities
- Authentication bypass issues
- Directory traversal attacks
- Injection vulnerabilities (SQL, command, etc.)
- Sensitive data exposure
- Privilege escalation issues

## Security Best Practices

### For Package Maintainers

1. **Regular Audits**: Run `npm audit` and `npm run security-check` regularly
2. **Dependency Updates**: Keep all dependencies up to date
3. **Code Review**: All changes require security review
4. **Automated Testing**: Implement security testing in CI/CD

### For Users

1. **Keep Updated**: Regularly update ginie-micro to the latest version
2. **Review Code**: Always review generated code before deployment
3. **Dependency Scanning**: Use `npm audit` in your generated projects
4. **Environment Variables**: Never commit .env files to version control

## Security Features

### Input Validation
- All user inputs are validated and sanitized
- File name sanitization prevents path traversal
- Protocol buffer validation for gRPC services

### Secure Defaults
- Non-root user execution recommended
- Secure file permissions
- Minimal dependency footprint

### Audit Trail
- Git hooks for commit validation
- Security checks during generation
- Vulnerability scanning integration

## Dependency Security

ginie-micro uses minimal dependencies and regularly:

1. Scans for known vulnerabilities
2. Updates to patched versions
3. Removes unused dependencies
4. Uses pinned versions for production dependencies

## Security Updates

Security updates are released as:
- **Patch versions**: For low-severity issues
- **Minor versions**: For medium-severity issues
- **Major versions**: For high-severity breaking changes

Subscribe to GitHub security alerts for notifications.