import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

export interface User {
    id: number;
    username: string;
    password: string;
}

@Injectable()
export class UsersService {
  private readonly users: User[] = [];

  async create(username: string, pass: string) {
    const hashedPassword = await bcrypt.hash(pass, 10);
    const newUser = { id: Date.now(), username, password: hashedPassword };
    this.users.push(newUser);
    return { id: newUser.id, username: newUser.username };
  }

  async findOne(username: string) {
    return this.users.find(user => user.username === username);
  }
}
