import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  describe('HttpException', () => {
    it('should respond with the exception status and body unchanged', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };

      const exception = new BadRequestException({
        statusCode: 400,
        message: ['error1', 'error2'],
        error: 'Bad Request',
      });

      filter.catch(exception, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: ['error1', 'error2'],
        error: 'Bad Request',
      });
    });

    it('should handle string HttpException message', () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };

      const exception = new HttpException('Custom error', HttpStatus.FORBIDDEN);

      filter.catch(exception, mockHost as any);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    });
  });

  describe('Other exceptions', () => {
    it('should log the error and respond with 500 generic message', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };

      const exception = new Error('Database connection failed');

      filter.catch(exception, mockHost as any);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unhandled exception:',
        expect.any(Error),
      );
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Lỗi máy chủ. Vui lòng thử lại.',
        error: 'Internal Server Error',
      });

      consoleSpy.mockRestore();
    });

    it('should not leak SQL or stack information in response', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const mockHost = {
        switchToHttp: jest.fn().mockReturnValue({
          getResponse: jest.fn().mockReturnValue(mockResponse),
        }),
      };

      const exception = new Error(
        'SELECT * FROM User WHERE id = 1 -- SQL Injection',
      );

      filter.catch(exception, mockHost as any);

      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.message).not.toContain('SELECT');
      expect(jsonCall.message).not.toContain('SQL');
      expect(jsonCall.error).toBe('Internal Server Error');

      consoleSpy.mockRestore();
    });
  });
});
