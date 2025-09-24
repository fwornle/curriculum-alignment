# MACAS Troubleshooting Guide

This comprehensive troubleshooting guide helps users quickly identify and resolve common issues with the Multi-Agent Curriculum Alignment System (MACAS).

## Quick Diagnostic Tools

### 🔧 System Health Checker

**Before troubleshooting, run our automated diagnostic:**

1. **Visit:** https://curriculum-alignment.ceu.edu/diagnostics
2. **Click:** "Run System Check"
3. **Review:** Automated report of potential issues
4. **Follow:** Recommended solutions

**What the health checker examines:**
- Browser compatibility and settings
- Network connectivity and performance
- User account status and permissions
- System availability and performance
- Recent error patterns

### ⚡ Quick Fixes Checklist

Try these solutions first for most common issues:

- [ ] **Refresh the page** (Ctrl+F5 or Cmd+Shift+R)
- [ ] **Clear browser cache** and cookies
- [ ] **Try incognito/private browsing** mode
- [ ] **Check internet connection** stability
- [ ] **Verify you're logged in** with correct credentials
- [ ] **Update your browser** to latest version
- [ ] **Disable browser extensions** temporarily
- [ ] **Try a different browser** (Chrome, Firefox, Safari, Edge)

## Authentication and Login Issues

### 🔐 Cannot Log In

**Symptoms:**
- Login button doesn't respond
- Error messages on login screen
- Redirected away from login page
- "Invalid credentials" messages

**Troubleshooting Steps:**

**Step 1: Verify Credentials**
```
✓ Check username/email spelling
✓ Verify password (try typing in a text editor first)
✓ Ensure Caps Lock is not on
✓ Try copying/pasting credentials
```

**Step 2: Browser Issues**
```
✓ Clear browser cache and cookies for curriculum-alignment.ceu.edu
✓ Disable pop-up blockers
✓ Check if cookies are enabled
✓ Try different browser or incognito mode
```

**Step 3: Network and Firewall**
```
✓ Check if you can access other CEU systems
✓ Try from different network (mobile hotspot)
✓ Contact IT if behind corporate firewall
✓ Verify no proxy settings blocking access
```

**Step 4: Account Status**
```
✓ Confirm account is active with IT department
✓ Check if password recently expired
✓ Verify account hasn't been suspended
✓ Ensure you have MACAS access permissions
```

**Common Solutions:**

**"Session Expired" Error:**
```javascript
// This error occurs when your session times out
Solution:
1. Close all browser tabs with MACAS
2. Clear browser cache for the site
3. Log in again
4. Keep browser tab active during long tasks
```

**"Account Locked" Message:**
```
Causes: Too many failed login attempts
Solution:
1. Wait 15 minutes before trying again
2. Contact support@macas.ceu.edu if urgent
3. Have admin unlock your account
```

### 🔄 SSO (Single Sign-On) Issues

**Problem: SSO Redirect Loop**
```
Symptoms: Page keeps redirecting between MACAS and CEU SSO
Solution:
1. Clear all cookies for *.ceu.edu domains
2. Close all browser tabs
3. Start fresh login process
4. Contact IT if problem persists
```

**Problem: "Not Authorized" After SSO**
```
Symptoms: Successfully log in to CEU but get access denied in MACAS
Cause: Account not provisioned in MACAS system
Solution:
1. Contact your department admin
2. Have them request MACAS access for your account
3. Allow 24 hours for provisioning
```

## Document Management Issues

### 📄 Document Upload Problems

**Upload Fails or Hangs**

**File Size Issues:**
```
Problem: "File too large" or upload progress stops
Solutions:
✓ Check file is under 50MB limit
✓ Compress large PDFs using online tools
✓ Split large documents into smaller sections
✓ Use document optimization tools
```

**File Format Issues:**
```
Problem: "Unsupported file type" error
Supported formats: PDF, DOCX, TXT, XLSX, CSV, PPTX
Solutions:
✓ Convert files to supported formats
✓ Ensure file extensions are correct
✓ Avoid password-protected files
✓ Check file isn't corrupted
```

**Network Upload Issues:**
```
Problem: Upload starts but fails or times out
Solutions:
✓ Check internet connection stability
✓ Try smaller files first
✓ Upload during off-peak hours
✓ Use wired connection instead of WiFi
✓ Close other bandwidth-intensive applications
```

**Browser Compatibility:**
```
Problem: Upload interface not working properly
Solutions:
✓ Update browser to latest version
✓ Enable JavaScript and disable ad blockers
✓ Try different browser
✓ Check browser file upload limits
```

### 🗂️ Document Organization Issues

**Cannot Create Folders:**
```
Problem: Folder creation button missing or not working
Check:
✓ You have appropriate permissions
✓ You're in the right section (Documents)
✓ Browser JavaScript is enabled
✓ Try refreshing the page
```

**Documents Not Appearing:**
```
Problem: Uploaded documents don't show in document list
Solutions:
1. Wait 5 minutes for processing
2. Check correct folder/filter selection
3. Clear browser cache
4. Check if upload actually completed
5. Contact support if documents missing after 1 hour
```

**Search Not Working:**
```
Problem: Document search returns no results
Troubleshooting:
✓ Check spelling and try different keywords
✓ Remove filters and try again
✓ Search by document title, not content
✓ Wait for new documents to be indexed (up to 30 minutes)
```

## Analysis and Processing Issues

### 🔍 Analysis Not Starting

**Analysis Stuck in Queue:**
```
Problem: Analysis shows "Queued" for extended time
Causes and Solutions:

High System Load:
- Normal queue time: 5-15 minutes
- Peak usage queue time: 30-60 minutes
- Check system status page for current load

Configuration Issues:
✓ Verify all required fields completed
✓ Check document selection is valid
✓ Ensure analysis type matches documents
✓ Try with fewer documents first

Permission Problems:
✓ Confirm access to selected documents
✓ Check if documents are still processing
✓ Verify analysis type is available for your account level
```

**Analysis Fails to Start:**
```
Error Messages and Solutions:

"No documents selected":
- Select at least one document
- Ensure documents finished uploading
- Check document access permissions

"Invalid analysis configuration":
- Review all parameter settings
- Use default settings first
- Check analysis type compatibility

"Insufficient permissions":
- Contact administrator for access
- Verify account has analysis privileges
- Check document ownership
```

### ⏱️ Long Processing Times

**Analysis Taking Too Long:**
```
Normal Processing Times:
- Single document: 2-5 minutes
- Small batch (2-5 docs): 10-20 minutes
- Large batch (10+ docs): 30-120 minutes
- Complex analysis: Up to 4 hours

When to be Concerned:
✓ Simple analysis running >30 minutes
✓ No progress updates for >2 hours
✓ Analysis shows "Processing" for >24 hours
```

**Optimization Tips:**
```
Speed Up Analysis:
✓ Use smaller document sets
✓ Choose simpler analysis types first
✓ Process during off-peak hours
✓ Ensure documents are high quality (searchable text)
✓ Remove unnecessary large documents
```

### ❌ Analysis Errors

**Common Error Messages:**

**"Analysis failed - Document processing error":**
```
Cause: Problem with uploaded documents
Solutions:
1. Check document quality and format
2. Ensure text is selectable (not scanned images)
3. Try analysis with single document to isolate issue
4. Re-upload problematic documents
5. Contact support with specific error details
```

**"Analysis failed - Configuration error":**
```
Cause: Invalid analysis parameters
Solutions:
1. Reset to default parameters
2. Verify alignment framework selection
3. Check custom settings for errors
4. Try standard analysis type first
5. Copy working configuration from previous analysis
```

**"Analysis failed - System error":**
```
Cause: Internal system issue
Solutions:
1. Wait 10 minutes and try again
2. Check system status page
3. Try simpler analysis configuration
4. Contact support if error persists
5. Report error code to technical team
```

## Report Generation Issues

### 📊 Reports Not Generating

**Report Generation Stuck:**
```
Problem: Report shows "Generating" indefinitely
Troubleshooting:
1. Wait up to 15 minutes for complex reports
2. Check if analysis completed successfully
3. Try generating simpler report format
4. Refresh page and try again
5. Check browser console for errors
```

**Empty or Incomplete Reports:**
```
Problem: Report generates but missing content
Causes:
- Analysis had no significant findings
- Report template configuration issue
- Data filtering too restrictive
- Permission issues with underlying data

Solutions:
✓ Review analysis results first
✓ Try different report template
✓ Adjust report parameters
✓ Check with simpler analysis
```

### 🖼️ Report Display Issues

**Formatting Problems:**
```
Common Issues and Fixes:

Charts not displaying:
- Enable JavaScript in browser
- Update browser to latest version
- Try different browser
- Check ad blocker settings

PDF export issues:
- Clear browser cache
- Try smaller report sections
- Check PDF viewer settings
- Use "Print to PDF" as alternative

Mobile display problems:
- Use desktop browser for complex reports
- Try landscape orientation
- Zoom out for full view
- Use simplified report template
```

## Performance and System Issues

### 🐌 Slow System Performance

**General Slowness:**
```
Browser-Side Optimizations:
✓ Clear browser cache and cookies
✓ Close unnecessary browser tabs
✓ Disable unused browser extensions
✓ Update browser to latest version
✓ Restart browser periodically

Network Optimizations:
✓ Check internet connection speed
✓ Use wired connection when possible
✓ Close bandwidth-intensive applications
✓ Try different network if available

System Optimizations:
✓ Close unnecessary applications
✓ Restart computer if running long time
✓ Check available disk space
✓ Update operating system
```

**Specific Performance Issues:**

**Page Loading Slowly:**
```
Immediate Actions:
1. Check system status page
2. Try different browser or incognito mode
3. Test with minimal browser configuration
4. Clear DNS cache (ipconfig /flushdns on Windows)

Long-term Solutions:
- Bookmark frequently used pages
- Use keyboard shortcuts for navigation
- Set up browser to start with MACAS homepage
- Consider browser optimization tools
```

**File Operations Slow:**
```
Upload/Download Optimization:
✓ Use smaller files when possible
✓ Process during off-peak hours (early morning/late evening)
✓ Compress files before uploading
✓ Use batch operations efficiently
✓ Monitor file operation progress
```

### 💾 Browser and Cache Issues

**Browser Compatibility:**
```
Supported Browsers:
✓ Chrome 90+ (Recommended)
✓ Firefox 88+ (Recommended)
✓ Safari 14+ (Mac only)
✓ Edge 90+ (Windows)

Unsupported:
✗ Internet Explorer (any version)
✗ Opera (limited support)
✗ Mobile browsers (basic functions only)
```

**Cache and Cookie Problems:**
```
Clearing Browser Data:

Chrome:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "All time" from time range
3. Check "Cookies" and "Cached images and files"
4. Click "Clear data"

Firefox:
1. Press Ctrl+Shift+Delete (Cmd+Shift+Delete on Mac)
2. Select "Everything" from time range
3. Check relevant items
4. Click "Clear Now"

Safari:
1. Safari menu → Preferences → Privacy
2. Click "Manage Website Data"
3. Search for "curriculum-alignment.ceu.edu"
4. Remove and restart browser
```

## Integration and API Issues

### 🔗 External System Integration Problems

**LMS Integration Issues:**
```
Canvas/Moodle/Blackboard Connection Problems:

Authentication Failures:
✓ Verify API keys are current and valid
✓ Check LMS permissions for MACAS app
✓ Confirm SSL certificates are valid
✓ Test API endpoints directly

Data Sync Problems:
✓ Check data mapping configuration
✓ Verify course/user permissions
✓ Look for data format changes in LMS
✓ Test with single course first

Connection Timeouts:
✓ Check network connectivity between systems
✓ Verify firewall settings allow API calls
✓ Test during off-peak hours
✓ Consider bandwidth limitations
```

**API Access Issues:**
```
Problem: API calls failing or returning errors

Rate Limiting:
- Reduce API call frequency
- Implement proper retry logic
- Check rate limit headers
- Contact support for limit increases

Authentication Errors:
- Verify API key is correct and active
- Check token expiration
- Confirm proper header formatting
- Test with API documentation examples

Data Format Issues:
- Validate JSON structure
- Check required fields
- Verify data types match API specs
- Use API validation tools
```

## Error Codes and Messages

### 🚨 Common Error Codes

**HTTP Status Codes:**

**400 Bad Request:**
```
Meaning: Invalid request format or parameters
Common Causes:
- Missing required fields
- Invalid data format
- Parameter values out of range

Solutions:
✓ Check all required fields are filled
✓ Validate data format (dates, numbers, etc.)
✓ Review API documentation
✓ Use browser developer tools to inspect request
```

**401 Unauthorized:**
```
Meaning: Authentication required or failed
Solutions:
✓ Log out and log back in
✓ Clear browser cookies
✓ Check account status with administrator
✓ Verify correct login credentials
```

**403 Forbidden:**
```
Meaning: Access denied for this resource
Solutions:
✓ Check user permissions with administrator
✓ Verify resource ownership
✓ Contact support if access should be granted
✓ Try with different user role
```

**404 Not Found:**
```
Meaning: Requested resource doesn't exist
Common Causes:
- Document or analysis was deleted
- URL typed incorrectly
- System maintenance in progress

Solutions:
✓ Check URL spelling
✓ Verify resource still exists
✓ Try accessing from main menu
✓ Clear browser cache
```

**429 Too Many Requests:**
```
Meaning: Rate limit exceeded
Solutions:
✓ Wait 15 minutes before trying again
✓ Reduce frequency of requests
✓ Contact support if limit seems too low
✓ Check if bulk operations are available
```

**500 Internal Server Error:**
```
Meaning: Server-side problem
Solutions:
✓ Wait 5 minutes and try again
✓ Check system status page
✓ Try simpler version of same action
✓ Contact support if error persists
✓ Report exact error message and steps
```

### 🔍 System-Specific Error Messages

**Document Processing Errors:**

**"Document format not supported":**
```
Problem: Uploaded file cannot be processed
Solutions:
1. Convert to supported format (PDF, DOCX, TXT)
2. Check file extension matches content
3. Ensure file isn't password protected
4. Try saving file in different format
```

**"Text extraction failed":**
```
Problem: Cannot read text from document
Causes:
- Scanned PDF without OCR
- Image-based document
- Corrupted file
- Encrypted content

Solutions:
✓ Use OCR software to make text selectable
✓ Re-create document with text content
✓ Check file isn't corrupted
✓ Remove encryption/password protection
```

**Analysis Engine Errors:**

**"Insufficient content for analysis":**
```
Problem: Not enough text to analyze
Solutions:
✓ Add more documents to analysis
✓ Ensure documents contain substantial text content
✓ Check that text is extractable from documents
✓ Combine with related documents
```

**"Framework compatibility error":**
```
Problem: Selected framework doesn't match document type
Solutions:
✓ Choose appropriate framework for document level
✓ Use general framework first
✓ Check document metadata for program level
✓ Contact support for custom framework needs
```

## Getting Additional Help

### 📞 When to Contact Support

**Contact Support Immediately For:**
- System-wide outages or errors
- Data loss or corruption
- Security concerns
- Account access issues lasting >24 hours
- Critical analysis failures near deadlines

**Before Contacting Support:**
1. Try the troubleshooting steps in this guide
2. Check the system status page
3. Search the knowledge base
4. Ask colleagues if they're having similar issues
5. Note exact error messages and steps to reproduce

**Information to Include in Support Requests:**
- Your name, institution, and MACAS username
- Browser and operating system details
- Exact error messages (screenshots preferred)
- Steps that led to the problem
- What you expected to happen vs. what actually happened
- Any troubleshooting steps you've already tried

### 🔗 Additional Resources

**Self-Help Resources:**
- **Knowledge Base:** https://help.curriculum-alignment.ceu.edu
- **Video Tutorials:** https://curriculum-alignment.ceu.edu/tutorials
- **Community Forums:** https://community.macas.ceu.edu
- **System Status:** https://status.curriculum-alignment.ceu.edu

**Training and Development:**
- **User Training:** [Training Materials](../training/index.md)
- **Best Practices:** [User Guide](../user-guide/index.md)
- **API Documentation:** [Developer Guide](../api/index.md)

---

*This troubleshooting guide is regularly updated based on user feedback and common support issues. If you don't find a solution to your problem, please contact our support team for personalized assistance.*

**Last updated:** March 2024  
**Version:** 2.1  
**Feedback:** troubleshooting-feedback@macas.ceu.edu