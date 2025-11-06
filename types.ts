
export type Member = {
  id: string;
  name: string;
  role: string;
  isManager: boolean;
  meals: MealEntry[];
  deposits: Deposit[];
  expenses: Expense[];
  balance: number;
};

export type MealEntry = {
  id: string;
  date: string;
  memberId: string;
  count: number;
};

export type Expense = {
  id: string;
  date: string;
  type: "grocery" | "other";
  amount: number;
  memberId: string;
  description?: string;
};

export type Deposit = {
  id: string;
  date: string;
  amount: number;
  memberId: string;
};
