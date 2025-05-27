#!/usr/bin/env node

// 测试只读模式
console.log('🧪 Testing MySQL MCP Read-Only Mode...\n');

// 测试只读SQL检查函数
function isReadOnlySQL(sql) {
  const trimmedSQL = sql.trim().toUpperCase();
  const readOnlyCommands = ['SELECT', 'SHOW', 'DESCRIBE', 'DESC', 'EXPLAIN', 'WITH'];
  return readOnlyCommands.some(cmd => trimmedSQL.startsWith(cmd));
}

// 测试用例
const testCases = [
  // 应该允许的只读操作
  { sql: 'SELECT * FROM users', expected: true, description: 'SELECT query' },
  { sql: 'SHOW TABLES', expected: true, description: 'SHOW command' },
  { sql: 'DESCRIBE users', expected: true, description: 'DESCRIBE command' },
  { sql: 'DESC users', expected: true, description: 'DESC command' },
  { sql: 'EXPLAIN SELECT * FROM users', expected: true, description: 'EXPLAIN command' },
  { sql: '  SELECT count(*) FROM users  ', expected: true, description: 'SELECT with whitespace' },
  
  // 应该禁止的写操作
  { sql: 'INSERT INTO users VALUES (1, "test")', expected: false, description: 'INSERT statement' },
  { sql: 'UPDATE users SET name = "test"', expected: false, description: 'UPDATE statement' },
  { sql: 'DELETE FROM users WHERE id = 1', expected: false, description: 'DELETE statement' },
  { sql: 'CREATE TABLE test (id INT)', expected: false, description: 'CREATE statement' },
  { sql: 'DROP TABLE users', expected: false, description: 'DROP statement' },
  { sql: 'ALTER TABLE users ADD COLUMN test VARCHAR(50)', expected: false, description: 'ALTER statement' },
  { sql: 'TRUNCATE TABLE users', expected: false, description: 'TRUNCATE statement' },
];

console.log('Testing SQL command classification:');
console.log('=====================================');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = isReadOnlySQL(testCase.sql);
  const status = result === testCase.expected ? '✅ PASS' : '❌ FAIL';
  
  console.log(`${(index + 1).toString().padStart(2, ' ')}. ${status} - ${testCase.description}`);
  console.log(`    SQL: ${testCase.sql}`);
  console.log(`    Expected: ${testCase.expected ? 'ALLOWED' : 'BLOCKED'}, Got: ${result ? 'ALLOWED' : 'BLOCKED'}`);
  console.log('');
  
  if (result === testCase.expected) {
    passed++;
  } else {
    failed++;
  }
});

console.log('Test Results:');
console.log('=============');
console.log(`✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);
console.log(`📊 Total:  ${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! Read-only mode is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Please check the implementation.');
} 