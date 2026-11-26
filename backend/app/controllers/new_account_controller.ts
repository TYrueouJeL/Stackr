import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { signupValidator } from '#validators/user'
import type { HttpContext } from '@adonisjs/core/http'
import UserTransformer from '#transformers/user_transformer'

export default class NewAccountController {
  async store({ request, serialize }: HttpContext) {
    const { fullName, email, password } = await request.validateUsing(signupValidator)

    const user = await db.transaction(async (trx) => {
      const existing = await trx.from('users').count('* as total')
      const isFirst = Number(existing[0].total) === 0
      const created = await User.create(
        { fullName, email, password, isAdmin: isFirst },
        { client: trx }
      )

      // Le premier compte récupère les données créées avant l'ajout des comptes
      if (isFirst) {
        for (const table of ['storage_locations', 'decklists', 'card_copies']) {
          await trx.from(table).whereNull('user_id').update({ user_id: created.id })
        }
      }
      return created
    })

    const token = await User.accessTokens.create(user)

    return serialize({
      user: UserTransformer.transform(user),
      token: token.value!.release(),
    })
  }
}
