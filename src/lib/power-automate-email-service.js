// lib/power-automate-email-service.js
export class PowerAutomateEmailService {
  constructor() {
    this.webhookUrl = process.env.POWER_AUTOMATE_WEBHOOK_URL;
    this.appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    if (!this.webhookUrl) {
      throw new Error('POWER_AUTOMATE_WEBHOOK_URL environment variable not configured');
    }
  }

  // Send password reset email via Power Automate
  async sendPasswordResetEmail(toEmail, resetToken, recipientName = 'Admin') {
    try {
      const payload = {
        recipientEmail: toEmail,
        recipientName: recipientName,
        resetToken: resetToken,
        appUrl: this.appUrl
      };

      console.log('📧 Sending password reset email via Power Automate to:', toEmail);
      console.log('🔗 Using webhook:', this.webhookUrl.substring(0, 50) + '...');

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Power Automate webhook failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return {
          success: false,
          error: `Power Automate webhook failed: ${response.status} ${response.statusText}`,
          details: errorText
        };
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Power Automate:', result);

      return {
        success: true,
        message: result.message || 'Email sent successfully',
        sentTo: result.sentTo || toEmail,
        sentAt: result.sentAt || new Date().toISOString(),
        provider: 'Power Automate'
      };

    } catch (error) {
      console.error('❌ Power Automate email service error:', error);
      
      let errorMessage = 'Failed to send email via Power Automate';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        errorMessage = 'Network error: Could not connect to Power Automate webhook';
      } else if (error.message.includes('webhook')) {
        errorMessage = 'Power Automate webhook configuration error';
      }

      return {
        success: false,
        error: errorMessage,
        details: error.message
      };
    }
  }

  // Send test email to verify Power Automate setup
  async sendTestEmail(toEmail) {
    try {
      const testToken = 'test-token-' + Date.now();
      
      const payload = {
        recipientEmail: toEmail,
        recipientName: 'Test Recipient',
        resetToken: testToken,
        appUrl: this.appUrl
      };

      console.log('🧪 Sending test email via Power Automate to:', toEmail);

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Power Automate test failed: ${response.status} ${response.statusText}`,
          details: errorText
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: 'Test email sent successfully via Power Automate',
        sentTo: toEmail,
        sentAt: new Date().toISOString(),
        provider: 'Power Automate',
        testToken: testToken,
        flowResult: result
      };

    } catch (error) {
      console.error('❌ Power Automate test email failed:', error);
      
      return {
        success: false,
        error: 'Test email failed',
        details: error.message
      };
    }
  }

  // Validate webhook configuration
  async validateConfiguration() {
    try {
      if (!this.webhookUrl) {
        return {
          valid: false,
          error: 'POWER_AUTOMATE_WEBHOOK_URL not configured',
          instructions: 'Set POWER_AUTOMATE_WEBHOOK_URL in your environment variables'
        };
      }

      // Check if URL looks like a Power Automate webhook
      const isValidWebhook = this.webhookUrl.includes('logic.azure.com') || 
                           this.webhookUrl.includes('prod-') ||
                           this.webhookUrl.includes('workflows');

      if (!isValidWebhook) {
        return {
          valid: false,
          error: 'Invalid Power Automate webhook URL format',
          instructions: 'URL should be from Power Automate HTTP trigger'
        };
      }

      return {
        valid: true,
        webhookUrl: this.webhookUrl.substring(0, 50) + '...',
        appUrl: this.appUrl,
        provider: 'Power Automate'
      };

    } catch (error) {
      return {
        valid: false,
        error: 'Configuration validation failed',
        details: error.message
      };
    }
  }

  // Get service status and configuration
  async getServiceStatus() {
    try {
      const config = await this.validateConfiguration();
      
      return {
        configured: config.valid,
        provider: 'Power Automate',
        webhookConfigured: !!this.webhookUrl,
        appUrlConfigured: !!this.appUrl,
        appUrl: this.appUrl,
        ready: config.valid,
        ...config
      };

    } catch (error) {
      return {
        configured: false,
        provider: 'Power Automate',
        error: error.message,
        ready: false
      };
    }
  }

  // Send notification email (for other admin notifications)
  async sendNotificationEmail(toEmail, subject, message, recipientName = 'Admin') {
    try {
      // For notifications, we can use a simpler payload or extend Power Automate flow
      // For now, we'll use the reset email format with custom content
      const payload = {
        recipientEmail: toEmail,
        recipientName: recipientName,
        resetToken: 'notification', // Special token to indicate this is a notification
        appUrl: this.appUrl,
        customSubject: subject,
        customMessage: message
      };

      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Notification email failed: ${response.status} ${response.statusText}`
        };
      }

      const result = await response.json();

      return {
        success: true,
        message: 'Notification email sent successfully',
        sentTo: toEmail,
        sentAt: new Date().toISOString(),
        provider: 'Power Automate'
      };

    } catch (error) {
      return {
        success: false,
        error: 'Failed to send notification email',
        details: error.message
      };
    }
  }
}

// Export singleton instance
export const emailService = new PowerAutomateEmailService();