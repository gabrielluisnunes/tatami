import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  preset: 'ts-jest',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFiles: ['<rootDir>/jest.setup.ts'],
  clearMocks: true,
}

export default config
