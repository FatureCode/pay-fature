import type { VercelRequest, VercelResponse } from '@vercel/node'
import { amountToString } from '../common/util';
import { ActionGetResponse } from '@solana/actions';
import { getTransaction, StorageTransaction } from '../data/transactions';
import { getUserVisibleIdParam } from '../common/util';

export async function handleGetRequest(req: VercelRequest, res: VercelResponse) {
  // Placeholder values
  const title = 'Cafe do Artur';
  const icon = 'https://liberal.com.br/wp-content/uploads/2021/06/Arthur-Fortunato-treinando-para-o-mundial-de-tiro-56-1624x1080.jpg';
  const userVisibleId = getUserVisibleIdParam(req.query);
  const transaction: StorageTransaction = await getTransaction(userVisibleId);
  const label = `Pay ${amountToString(transaction.amount)}`;
  const data: ActionGetResponse = {
    icon,
    title,
    description: `Make secure payments with Fature.`,
    label,
  };
  res.json(data);
}