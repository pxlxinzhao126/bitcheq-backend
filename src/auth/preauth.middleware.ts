import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response } from 'express';
import * as firebase from 'firebase-admin';
import * as serviceAccount from './firebase.json';

const firebase_params = {
  type: serviceAccount.type,
  projectId: serviceAccount.project_id,
  privateKeyId: serviceAccount.private_key_id,
  privateKey: serviceAccount.private_key,
  clientEmail: serviceAccount.client_email,
  clientId: serviceAccount.client_id,
  authUri: serviceAccount.auth_uri,
  tokenUri: serviceAccount.token_uri,
  authProviderX509CertUrl: serviceAccount.auth_provider_x509_cert_url,
  clientC509CertUrl: serviceAccount.client_x509_cert_url,
};

const whitelist = [
  'users/verifyEmail',
  'auth/login',
  'users/create',
  'block/webhook',
];

const webhookIpWhitelist = [
  '::1',
  '99.245.188.170',
  '45.56.79.5',
  '45.56.123.170',
  '45.33.20.161',
  '45.33.4.167',
  '2600:3c00::f03c:91ff:fe33:2e14',
  '2600:3c00::f03c:91ff:fe89:bb9b',
  '2600:3c00::f03c:91ff:fe33:d082',
  '2600:3c00::f03c:92ff:fe5e:4219',
];

@Injectable()
export class PreauthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PreauthMiddleware.name);

  private defaultApp: any;

  constructor() {
    this.defaultApp = firebase.initializeApp({
      credential: firebase.credential.cert(firebase_params),
      databaseURL: 'https://bitcheq-default-rtdb.firebaseio.com/',
    });
  }

  use(req: Request, res: Response, next: Function) {
    if (this.inWhitelist(req)) {
      if (
        req.params['0'] === 'block/webhook' &&
        !this.validateIpForWebhook(req)
      ) {
        this.accessDenied(req.url, res);
      } else {
        next();
      }
    } else {
      const token = req.headers.authorization;

      if (!token) {
        this.accessDenied(req.url, res);
      } else {
        this.defaultApp
          .auth()
          .verifyIdToken(token.replace('Bearer ', ''))
          .then(async (decodedToken) => {
            const user = decodedToken.email;
            req['user'] = user;
            next();
          })
          .catch((error) => {
            console.error(error);
            this.accessDenied(req.url, res);
          });
      }
    }
  }

  private accessDenied(url: string, res: Response) {
    res.status(403).json({
      statusCode: 403,
      timestamp: new Date().toISOString(),
      path: url,
      message: 'Access Denied',
    });
  }

  private validateIpForWebhook(req): boolean {
    var ip =
      req.headers['x-forwarded-for'] ||
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      (req.connection['socket']
        ? req.connection['socket'].remoteAddress
        : null);

    this.logger.debug(`Request <<${req.params['0']}>> from IP <<${ip}>>`);

    if (webhookIpWhitelist.indexOf(ip) > -1) {
      return true;
    } else {
      this.logger.error(`IP is not whitelisted`);
      return false;
    }
  }

  private inWhitelist(req): boolean {
    if (whitelist.indexOf(req.params['0']) > -1) {
      return true;
    }
    return false;
  }
}
