# Contributing to QueryJSON

Thank you for considering contributing to QueryJSON!

## 🤝 How to Contribute

**Ways to contribute:**
- Report bugs or suggest features via GitHub Issues
- Fix bugs or add features via Pull Requests
- Improve documentation
- Help others in discussions

## 🛠️ Quick Setup

1. Fork the repository on GitHub
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/queryjson.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Start local server: `python3 -m http.server 8000` or `npx http-server -p 8000`
5. Make changes and test in browser
6. Commit and push to your fork
7. Open a Pull Request

**No build tools needed!** Just edit files and refresh the browser.

## 💻 Code Standards

**JavaScript:**
- Use `const`/`let`, avoid `var`
- ES6+ features preferred
- Keep functions small and focused
- Add comments for complex logic

**CSS:**
- Use existing CSS variables
- Mobile-first responsive design
- Group related styles together

**HTML:**
- Semantic HTML5 elements
- Accessibility (ARIA labels, alt text)

## 📝 Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(scope): add new feature
fix(scope): fix bug description
docs: update documentation
style: formatting changes
refactor: code refactoring
```

**Examples:**
```
feat(export): add markdown export option
fix(query): handle null values in SQL queries
docs: add JSONPath examples to README
```

## 🔍 Before Submitting PR

**Test checklist:**
- [ ] Works in Chrome, Firefox, Safari
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] No console errors
- [ ] Tested with different JSON structures
- [ ] Documentation updated if needed

## 🐛 Bug Reports

Include:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS version
- Sample JSON (if applicable)

## 💡 Feature Requests

Include:
- Feature description
- Problem it solves
- Proposed solution
- Examples from other tools (if any)

## 📁 Key Files

- `index.html` - Main HTML structure
- `static/css/styles.css` - All styles
- `static/js/app.js` - Application logic

## 🌟 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the community

---

Questions? Open an issue or discussion on GitHub. **Happy Contributing! 🚀**
