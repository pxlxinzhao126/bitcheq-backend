import { Injectable, NestMiddleware } from '@nestjs/common';
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

const whitelist = ['users', 'auth/login', 'users/create', 'block/webhook'];

@Injectable()
export class PreauthMiddleware implements NestMiddleware {
  private defaultApp: any;

  constructor() {
    this.defaultApp = firebase.initializeApp({
      credential: firebase.credential.cert(firebase_params),
      databaseURL: 'https://bitcheq-default-rtdb.firebaseio.com/',
    });
  }

  use(req: Request, res: Response, next: Function) {
    const token = req.headers.authorization;

    if (this.inWhitelist(req)) {
      next();
      return;
    }

    if (!token) {
      this.accessDenied(req.url, res);
      return;
    }

    this.defaultApp
      .auth()
      .verifyIdToken(token.replace('Bearer ', ''))
      .then(async (decodedToken) => {
        const user = {
          email: decodedToken.email,
        };
        req['user'] = user;
        next();
      })
      .catch((error) => {
        console.error(error);
        this.accessDenied(req.url, res);
      });
  }

  private accessDenied(url: string, res: Response) {
    res.status(403).json({
      statusCode: 403,
      timestamp: new Date().toISOString(),
      path: url,
      message: 'Access Denied',
    });
  }

  private inWhitelist(req): boolean {
    if (whitelist.indexOf(req.params['0']) > -1) {
      return true;
    }
    return false;
  }
}
