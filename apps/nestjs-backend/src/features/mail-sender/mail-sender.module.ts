/* eslint-disable @typescript-eslint/naming-convention */
import path from 'path';
import type { DynamicModule } from '@nestjs/common';
import { ConfigurableModuleBuilder, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { createTransport } from 'nodemailer';
import type { IMailConfig } from '../../configs/mail.config';
import { SettingOpenApiModule } from '../setting/open-api/setting-open-api.module';
import { buildEmailFrom, helpers } from './mail-helpers';
import { MailSenderService } from './mail-sender.service';

export interface MailSenderModuleOptions {
  global?: boolean;
}

export const { ConfigurableModuleClass: MailSenderModuleClass, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<MailSenderModuleOptions>().build();

/**
 * Wrap a real SMTP transport so a dev machine without a local SMTP server boots
 * without an ERROR-level stack (@nestjs-modules/mailer always calls verify() at init).
 * Verification failures still surface — as a single WARN line in non-production.
 */
function createDevSafeTransport(options: object) {
  const real = createTransport(options as Parameters<typeof createTransport>[0]);
  const warnUnreachable = (err: Error) =>
    Logger.warn(
      `SMTP transporter unreachable (${err.message}) — emails will fail until it is available.`,
      'MailSenderModule'
    );
  // A transport *plugin* (object with send/verify) is the only shape nodemailer
  // passes through unchanged — handing it a Mail instance makes it rebuild an
  // SMTPTransport from defaults and our verify override is lost.
  return {
    name: 'DevSafeSMTP',
    version: '1.0.0',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: (mail: any, callback: any) =>
      (
        real as unknown as { transporter: { send: (m: unknown, cb: unknown) => void } }
      ).transporter.send(mail, callback),
    verify: (callback?: (err: Error | null, success: boolean) => void) => {
      const result = real
        .verify()
        .then(() => true)
        .catch((err: Error) => {
          warnUnreachable(err);
          return true;
        });
      if (callback) {
        void result.then((ok) => callback(null, ok));
        return;
      }
      return result;
    },
    close: () => real.close(),
  };
}

/**
 * Create a no-op transport for when mail is not configured.
 * This transport logs emails instead of sending them and has a proper verify() method
 * that returns a Promise (required by @nestjs-modules/mailer).
 */
function createNoOpTransport() {
  const real = createTransport({ jsonTransport: true });
  // Must be a transport *plugin* (object with send/verify): passing a Mail
  // instance makes nodemailer rebuild an SMTPTransport from defaults
  // (localhost:587) — which is exactly the phantom ECONNREFUSED previously
  // logged at every boot when mail was unconfigured.
  return {
    name: 'NoOpMail',
    version: '1.0.0',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    send: (mail: any, callback: any) =>
      (
        real as unknown as { transporter: { send: (m: unknown, cb: unknown) => void } }
      ).transporter.send(mail, callback),
    verify: (callback?: (err: Error | null, success: boolean) => void) => {
      if (callback) {
        callback(null, true);
        return;
      }
      return Promise.resolve(true);
    },
    close: () => real.close(),
  };
}

@Module({})
export class MailSenderModule extends MailSenderModuleClass {
  static register(): DynamicModule {
    const module = MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const mailConfig = config.getOrThrow<IMailConfig>('mail');
        const templatePagesDir = path.join(__dirname, '/templates/pages');
        const templatePartialsDir = path.join(__dirname, '/templates/partials');

        Logger.log(`[Mail Template Pages Dir]: ${templatePagesDir}`);
        Logger.log(`[Mail Template Partials Dir]: ${templatePartialsDir}`);

        // If mail is not configured, use a no-op transport that logs instead of sending
        // and has a proper verify() method that returns a Promise
        const smtpOptions = {
          host: mailConfig.host,
          port: mailConfig.port,
          secure: mailConfig.secure,
          auth: {
            user: mailConfig.auth.user,
            pass: mailConfig.auth.pass,
          },
        };
        const transport = mailConfig.isConfigured
          ? process.env.NODE_ENV === 'production'
            ? smtpOptions
            : createDevSafeTransport(smtpOptions)
          : createNoOpTransport();

        if (!mailConfig.isConfigured) {
          Logger.warn(
            '[MailSenderModule] Mail is not configured. Emails will be logged instead of sent.',
            'MailSenderModule'
          );
        }

        return {
          transport,
          defaults: {
            from: buildEmailFrom(mailConfig.sender, mailConfig.senderName),
          },
          template: {
            dir: templatePagesDir,
            adapter: new HandlebarsAdapter(helpers(config)),
            options: {
              strict: true,
            },
          },
          options: {
            partials: {
              dir: templatePartialsDir,
              options: {
                strict: true,
              },
            },
          },
        };
      },
    });

    return {
      imports: [SettingOpenApiModule, module],
      module: MailSenderModule,
      providers: [MailSenderService],
      exports: [MailSenderService],
    };
  }
}
