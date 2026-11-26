import type User from '#models/user'
import { BaseTransformer } from '@adonisjs/core/transformers'

export default class UserTransformer extends BaseTransformer<User> {
  toObject() {
    return {
      ...this.pickFields(),
      isAdmin: Boolean(this.resource.isAdmin),
    }
  }

  private pickFields() {
    return this.pick(this.resource, [
      'id',
      'fullName',
      'email',
      'createdAt',
      'updatedAt',
      'initials',
    ])
  }
}
