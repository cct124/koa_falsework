import { request, summary, body, tags, middlewares, path, description, query } from 'koa-swagger-decorator';
const { Res } = require('../../plugins/utils');

const tag = tags(['User']);

const userSchema = {
  name: { type: 'string', required: true, pattern: "[a-z0-9]{8,64}", minLength: 8, maxLength: 64 },
  password: { type: 'string', required: true }
};

const logTime = () => async (ctx, next) => {
  console.log(`start: ${new Date()}`);
  await next();
  console.log(`end: ${new Date()}`);
};
export default class UserRouter {
  @request('POST', '/user/register')
  @summary('register user')
  @description('example of api')
  @tag
  @middlewares([logTime()])
  @body(userSchema)
  static async register(ctx) {
    console.log(ctx.request.body);
    const { name } = ctx.validatedBody;
    const user = { name };
    ctx.body = { user };
  }

  @request('post', '/user/login')
  @summary('user login, password is 123456')
  @tag
  @body(userSchema)
  static async login(ctx) {
    const { name, password } = ctx.validatedBody;
    if (password !== '123456') throw new Error('wrong password');
    const user = { name };
    ctx.body = { user };
  }

  @request('get', '/user')
  @summary('user list')
  @tag
  static async getAll(ctx) {
    const users = [{ name: 'foo' }, { name: 'bar' }];
    ctx.body = {
      code: 2001,
      data: null,
      msg: '参数错误',
    };
  }

  @request('get', '/user/{id}')
  @summary('get user by id')
  @tag
  @path({ id: { type: 'string', required: true } })
  static async getOne(ctx) {
    const { id } = ctx.validatedParams;
    console.log('id:', id);
    const user = { name: 'foo' };
    ctx.body = { user };
  }

  @request('DELETE', '/user/{id}')
  @summary('delete user by id')
  @tag
  @path({ id: { type: 'string', required: true } })
  static async deleteOne(ctx) {
    const { id } = ctx.validatedParams;
    console.log('id:', id);
    ctx.body = { msg: 'success' };
  }

  @request('get', '/userList')
  @summary('查询用户列表')
  @description('查询用户列表传入参数获取用户列表')
  @tag
  @query({
    id: { type: 'string', description: '用户id', required: true }
  })
  static async getUserList(ctx) {
    const { id } = ctx.request.query;
    new Res(ctx, {
      code: 2000,
      data: id,
      msg: '获取数据成功'
    }).res();
  }
}
