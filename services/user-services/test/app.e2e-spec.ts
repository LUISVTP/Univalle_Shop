import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { APP_FILTER } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserController } from '../src/user/infrastructure/http/user.controller.js';
import { UserErrorFilter } from '../src/user/infrastructure/http/user-error.filter.js';
import { CreateUserUseCase } from '../src/user/application/use-cases/create-user.use-case.js';
import { EmailAlreadyExists } from '../src/user/domain/errors.js';
import { ScryptPasswordHasher } from '../src/user/infrastructure/adapter/scrypt-password-hasher.js';

describe('Users HTTP con puerto de persistencia sustituido', () => {
  let app: INestApplication;
  const save = vi.fn(async (user) => ({ ...user, id: 'test-id' }));
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        { provide: APP_FILTER, useClass: UserErrorFilter },
        {
          provide: CreateUserUseCase,
          useFactory: () =>
            new CreateUserUseCase(
              { SaveUser: save },
              new ScryptPasswordHasher(),
              'correounivalle.edu.co',
            ),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
  });
  it('POST /users devuelve 201 sin hash ni contraseña', async () => {
    const result = await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana',
        email: 'ana@correounivalle.edu.co',
        password: 'ClaveLarga123!',
      })
      .expect(201);
    expect(result.body).toEqual({
      id: 'test-id',
      name: 'Ana',
      email: 'ana@correounivalle.edu.co',
    });
  });
  it('POST /users devuelve 400 por correo externo', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'Ana', email: 'ana@gmail.com', password: 'ClaveLarga123!' })
      .expect(400);
  });
  it('POST /users devuelve 409 por duplicado', async () => {
    save.mockRejectedValueOnce(
      new EmailAlreadyExists('El correo ya está registrado'),
    );
    await request(app.getHttpServer())
      .post('/users')
      .send({
        name: 'Ana',
        email: 'ana@correounivalle.edu.co',
        password: 'ClaveLarga123!',
      })
      .expect(409);
  });
});
