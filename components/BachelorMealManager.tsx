import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/Table";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";
import { User, Plus, Wallet, ShoppingCart, Home, Wifi, Tag, ArrowLeft, Settings, History, Edit, Trash, Crown, X, Calendar } from "./icons";
import { Member, MealEntry, Expense, Deposit } from "../types";
import { CustomCalendar } from "./ui/CustomCalendar";

// Initial empty data
const initialMembers: Member[] = [
  {
    id: "1",
    name: "Member 1",
    role: "Cook",
    isManager: true,
    meals: [],
    deposits: [],
    expenses: [],
    balance: 0,
  },
  {
    id: "2",
    name: "Member 2",
    role: "Member",
    isManager: false,
    meals: [],
    deposits: [],
    expenses: [],
    balance: 0,
  },
  {
    id: "3",
    name: "Member 3",
    role: "Member",
    isManager: false,
    meals: [],
    deposits: [],
    expenses: [],
    balance: 0,
  },
];

// Type for combined transaction history
type Transaction = {
  id: string;
  date: string;
  type: "Meal" | "Deposit" | "Grocery" | "Other Expense";
  memberId: string;
  memberName: string;
  amount: number;
  description?: string;
  count?: number;
};


export default function BachelorMealManager() {
  // Helper function to get today's date in YYYY-MM-DD format, respecting local timezone
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [view, setView] = useState<"dashboard" | "member-detail" | "history" | "settings">("dashboard");
  const [newMemberName, setNewMemberName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState("");

  // New state for month selection
  const [currentMonth, setCurrentMonth] = useState<string>(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [settingsMonth, setSettingsMonth] = useState<string>(currentMonth);
  const [settingsMembers, setSettingsMembers] = useState<Member[]>([]);

  // State to manage which history to show
  const [historyFilter, setHistoryFilter] = useState<'all' | 'meals' | 'grocery' | 'deposits' | 'other'>('all');


  // Modal visibility states
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [isGroceryModalOpen, setIsGroceryModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isOtherModalOpen, setIsOtherModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Custom Calendar state
  const [activeCalendar, setActiveCalendar] = useState<string | null>(null);
  const calendarWrapperRef = useRef<HTMLDivElement>(null);

  // Form states
  const [mealForm, setMealForm] = useState({
    date: getTodayDateString(),
    counts: {} as { [key: string]: number },
  });
  const [expenseForm, setExpenseForm] = useState({ 
    date: getTodayDateString(),
    memberId: "", 
    type: "grocery" as "grocery" | "other", 
    amount: 0,
    description: ""
  });
  const [depositForm, setDepositForm] = useState({
    date: getTodayDateString(),
    memberId: "", 
    amount: 0 
  });
  const [otherExpenseForm, setOtherExpenseForm] = useState({ 
    date: getTodayDateString(),
    memberId: "", 
    amount: 0,
    description: ""
  });
  
  // State for editing a transaction
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editFormState, setEditFormState] = useState({
      date: '',
      memberId: '',
      amount: 0,
      count: 0,
      description: '',
  });


  // Sync settings when navigating to settings page
  useEffect(() => {
    if (view === "settings") {
      setSettingsMonth(currentMonth);
      // Create a deep copy to avoid modifying the original state directly
      setSettingsMembers(JSON.parse(JSON.stringify(members)));
    }
  }, [view, members, currentMonth]); // Run only when view changes
  
  // Handle closing calendar on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (calendarWrapperRef.current && !calendarWrapperRef.current.contains(event.target as Node)) {
            setActiveCalendar(null);
        }
    };
    if (activeCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
        document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [activeCalendar]);

  const toggleCalendar = (name: string) => {
    setActiveCalendar(prev => (prev === name ? null : name));
  };

  const handleDateChange = (name: string, newDate: string) => {
    switch(name) {
      case 'meal':
        setMealForm(prev => ({ ...prev, date: newDate }));
        break;
      case 'grocery':
        setExpenseForm(prev => ({ ...prev, date: newDate }));
        break;
      case 'deposit':
        setDepositForm(prev => ({ ...prev, date: newDate }));
        break;
      case 'other':
        setOtherExpenseForm(prev => ({ ...prev, date: newDate }));
        break;
      case 'edit':
        setEditFormState(prev => ({ ...prev, date: newDate }));
        break;
    }
    setActiveCalendar(null);
  };
  
  const formatDateForDisplay = (dateString: string) => {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };


  // Calculate financial metrics using useMemo to prevent infinite loops
  const financialMetrics = useMemo(() => {
    // Calculate totals
    let totalMealsCount = 0;
    let totalGroceryAmount = 0;
    let totalDepositAmount = 0;
    let totalOtherAmount = 0;
    
    members.forEach(member => {
      totalMealsCount += member.meals.reduce((sum, meal) => sum + meal.count, 0);
      totalGroceryAmount += member.expenses
        .filter(exp => exp.type === "grocery")
        .reduce((sum, exp) => sum + exp.amount, 0);
      totalDepositAmount += member.deposits.reduce((sum, dep) => sum + dep.amount, 0);
      totalOtherAmount += member.expenses
        .filter(exp => exp.type === "other")
        .reduce((sum, exp) => sum + exp.amount, 0);
    });
    
    // Calculate meal rate (only grocery expenses)
    const mealRate = totalMealsCount > 0 
      ? totalGroceryAmount / totalMealsCount 
      : 0;
    
    // Calculate total balance (Total Joma - Total Bajar)
    const totalBalance = totalDepositAmount - totalGroceryAmount;
    
    return {
      mealRate: parseFloat(mealRate.toFixed(2)),
      totalMeals: totalMealsCount,
      totalGrocery: totalGroceryAmount,
      totalDeposits: totalDepositAmount,
      totalOtherExpenses: totalOtherAmount,
      totalBalance: parseFloat(totalBalance.toFixed(2))
    };
  }, [members]);

  // Calculate member balances
  const membersWithBalances = useMemo(() => {
    return members.map(member => {
      const memberMeals = member.meals.reduce((sum, meal) => sum + meal.count, 0);
      const memberDeposits = member.deposits.reduce((sum, dep) => sum + dep.amount, 0);
      const memberGroceryExpense = member.expenses
        .filter(exp => exp.type === "grocery")
        .reduce((sum, exp) => sum + exp.amount, 0);
      const memberOtherExpense = member.expenses
        .filter(exp => exp.type === "other")
        .reduce((sum, exp) => sum + exp.amount, 0);
      
      // Member's balance is their deposits minus their meal costs.
      // Grocery and other expenses are not counted as a direct contribution to personal balance.
      const memberContributions = memberDeposits;
      const memberMealCost = memberMeals * financialMetrics.mealRate;
      const balance = memberContributions - memberMealCost;
      
      return {
        ...member,
        balance: parseFloat(balance.toFixed(2)),
        totalMeals: memberMeals,
        totalDeposits: memberDeposits,
        totalGroceryExpense: memberGroceryExpense,
        totalOtherExpense: memberOtherExpense
      };
    });
  }, [members, financialMetrics.mealRate]);

  // Get the current manager
  const manager = useMemo(() => members.find(m => m.isManager), [members]);

  // Handle opening meal modal
  const openMealModal = () => {
    const initialCounts = members.reduce((acc, member) => {
      acc[member.id] = 0;
      return acc;
    }, {} as { [key: string]: number });
    setMealForm({
      date: getTodayDateString(),
      counts: initialCounts
    });
    setIsMealModalOpen(true);
  };
  
  const openGroceryModal = () => {
      setExpenseForm({
        date: getTodayDateString(),
        memberId: "",
        type: "grocery",
        amount: 0,
        description: "",
      });
      setIsGroceryModalOpen(true);
    };

    const openDepositModal = () => {
      setDepositForm({
        date: getTodayDateString(),
        memberId: "",
        amount: 0,
      });
      setIsDepositModalOpen(true);
    };

    const openOtherModal = () => {
      setOtherExpenseForm({
        date: getTodayDateString(),
        memberId: "",
        amount: 0,
        description: "",
      });
      setIsOtherModalOpen(true);
    };

  // Handle updating meal count for a member
  const updateMealCount = (memberId: string, change: number) => {
    setMealForm(prev => ({
      ...prev,
      counts: {
        ...prev.counts,
        [memberId]: Math.max(0, (prev.counts[memberId] || 0) + change),
      },
    }));
  };

  // Handle adding meals for multiple members
  const handleAddMeal = () => {
    const mealEntries: { memberId: string, entry: MealEntry }[] = [];
    const { date, counts } = mealForm;

    for (const memberId in counts) {
      if (counts[memberId] > 0) {
        mealEntries.push({
          memberId: memberId,
          entry: {
            id: `m-${Date.now()}-${memberId}`,
            date: date,
            memberId: memberId,
            count: counts[memberId]
          }
        });
      }
    }

    if (mealEntries.length === 0) {
      setIsMealModalOpen(false);
      return;
    }

    setMembers(prevMembers => 
      prevMembers.map(member => {
        const newMealsForMember = mealEntries
          .filter(e => e.memberId === member.id)
          .map(e => e.entry);
        
        return newMealsForMember.length > 0 
          ? { ...member, meals: [...member.meals, ...newMealsForMember] } 
          : member;
      })
    );
    
    setIsMealModalOpen(false);
  };


  // Handle adding grocery expense
  const handleAddGrocery = () => {
    if (!expenseForm.memberId || expenseForm.amount <= 0) return;
    
    const newExpense: Expense = {
      id: `e-${Date.now()}-g`,
      date: expenseForm.date,
      type: "grocery",
      amount: expenseForm.amount,
      memberId: expenseForm.memberId,
      description: expenseForm.description,
    };
    
    setMembers(prev => prev.map(member => 
      member.id === expenseForm.memberId 
        ? { ...member, expenses: [...member.expenses, newExpense] } 
        : member
    ));
    
    setIsGroceryModalOpen(false);
  };

  // Handle adding deposit
  const handleAddDeposit = () => {
    if (!depositForm.memberId || depositForm.amount <= 0) return;
    
    const newDeposit: Deposit = {
      id: `d-${Date.now()}`,
      date: depositForm.date,
      amount: depositForm.amount,
      memberId: depositForm.memberId
    };
    
    setMembers(prev => prev.map(member => 
      member.id === depositForm.memberId 
        ? { ...member, deposits: [...member.deposits, newDeposit] } 
        : member
    ));
    
    setIsDepositModalOpen(false);
  };

  // Handle adding other expense
  const handleAddOtherExpense = () => {
    if (!otherExpenseForm.memberId || otherExpenseForm.amount <= 0) return;
    
    const newExpense: Expense = {
      id: `e-${Date.now()}-o`,
      date: otherExpenseForm.date,
      type: "other",
      amount: otherExpenseForm.amount,
      memberId: otherExpenseForm.memberId,
      description: otherExpenseForm.description
    };
    
    setMembers(prev => prev.map(member => 
      member.id === otherExpenseForm.memberId 
        ? { ...member, expenses: [...member.expenses, newExpense] } 
        : member
    ));
    
    setIsOtherModalOpen(false);
  };

  // Add new member (in settings view)
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    
    const newMember: Member = {
      id: `member-${Date.now()}`,
      name: newMemberName,
      role: "Member",
      isManager: false,
      meals: [],
      deposits: [],
      expenses: [],
      balance: 0
    };
    
    setSettingsMembers(prev => [...prev, newMember]);
    setNewMemberName("");
  };

  // Start editing member name
  const startEditingMember = (member: Member) => {
    setEditingMemberId(member.id);
    setEditingMemberName(member.name);
  };

  // Save edited member name (in settings view)
  const saveEditedMember = () => {
    if (!editingMemberId || !editingMemberName.trim()) return;
    
    setSettingsMembers(prev => 
      prev.map(member => 
        member.id === editingMemberId 
          ? { ...member, name: editingMemberName } 
          : member
      )
    );
    
    setEditingMemberId(null);
    setEditingMemberName("");
  };

  // Delete member (in settings view)
  const deleteMember = (memberId: string) => {
    if (settingsMembers.length <= 1) {
      alert("Cannot delete the last member");
      return;
    }
    
    setSettingsMembers(prev => prev.filter(member => member.id !== memberId));
  };

  // Set member as manager (in settings view)
  const setMemberAsManager = (memberId: string) => {
    setSettingsMembers(prev => 
      prev.map(member => ({
        ...member,
        isManager: member.id === memberId
      }))
    );
  };


  // Handle opening the edit modal
  const handleOpenEditModal = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setEditFormState({
        date: transaction.date,
        memberId: transaction.memberId,
        amount: transaction.amount || 0,
        count: transaction.count || 0,
        description: transaction.description || '',
    });
    setIsEditModalOpen(true);
  };

  // Handle updating a transaction from history
  const handleUpdateTransaction = () => {
    if (!editingTransaction) return;

    const { id, type, memberId: originalMemberId } = editingTransaction;
    const { date, memberId: newMemberId, amount, count, description } = editFormState;

    setMembers(prevMembers => {
      let updatedMembers = JSON.parse(JSON.stringify(prevMembers));

      // Step 1: Find the original transaction and remove it
      let transactionData: MealEntry | Deposit | Expense | null = null;
      const oldMember = updatedMembers.find((m: Member) => m.id === originalMemberId);
      if (oldMember) {
        if (type === 'Meal') {
          transactionData = oldMember.meals.find((t: MealEntry) => t.id === id) || null;
          oldMember.meals = oldMember.meals.filter((t: MealEntry) => t.id !== id);
        } else if (type === 'Deposit') {
          transactionData = oldMember.deposits.find((t: Deposit) => t.id === id) || null;
          oldMember.deposits = oldMember.deposits.filter((t: Deposit) => t.id !== id);
        } else {
          transactionData = oldMember.expenses.find((t: Expense) => t.id === id) || null;
          oldMember.expenses = oldMember.expenses.filter((t: Expense) => t.id !== id);
        }
      }

      if (!transactionData) return prevMembers; // Failsafe

      // Step 2: Update the transaction data
      transactionData.date = date;
      transactionData.memberId = newMemberId;

      if (type === 'Meal' && 'count' in transactionData) {
        transactionData.count = count;
      } else if (type === 'Deposit' && 'amount' in transactionData) {
        transactionData.amount = amount;
      } else if (['Grocery', 'Other Expense'].includes(type) && 'amount' in transactionData) {
        transactionData.amount = amount;
        if ('description' in transactionData) {
          transactionData.description = description;
        }
      }

      // Step 3: Add the updated transaction to the correct member
      const newMember = updatedMembers.find((m: Member) => m.id === newMemberId);
      if (newMember) {
        if (type === 'Meal') {
          newMember.meals.push(transactionData as MealEntry);
        } else if (type === 'Deposit') {
          newMember.deposits.push(transactionData as Deposit);
        } else {
          newMember.expenses.push(transactionData as Expense);
        }
      }
      
      return updatedMembers;
    });

    // Close modal and reset states
    setIsEditModalOpen(false);
    setEditingTransaction(null);
  };


  // Handle saving settings
  const handleSaveChanges = () => {
    setCurrentMonth(settingsMonth);
    setMembers(settingsMembers); // Apply changes from settings
    alert("Settings saved successfully!");
  };

  // View member detail page
  const viewMemberDetail = (member: Member) => {
    setSelectedMember(member);
    setView("member-detail");
  };

  // Go back to dashboard
  const goBackToDashboard = () => {
    setView("dashboard");
    setSelectedMember(null);
    setHistoryFilter('all');
  };

  // Render dashboard view
  const renderDashboard = () => (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <header className="mb-8 pb-6 border-b border-slate-200">
        <div className="relative flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Bachelor Meal Manager</h1>
            <p className="text-slate-500 mt-1">Track shared expenses and calculate balances</p>
          </div>

          {manager && (
            <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center space-x-2 bg-white rounded-lg px-4 py-2 border border-slate-200 shadow-sm">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-sm font-semibold text-slate-700">{manager.name}</span>
            </div>
          )}

          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setView("history");
                setHistoryFilter("all");
              }}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setView("settings")}
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
        <div className="mt-4 text-sm text-slate-600">
          Showing data for: <span className="font-semibold text-violet-600">{currentMonth}</span>
        </div>
      </header>

      {/* Top Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <Tag className="w-5 h-5 mr-2 text-violet-500" />
              Meal Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">৳{financialMetrics.mealRate.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Per meal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <Wallet className="w-5 h-5 mr-2 text-violet-500" />
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">৳{financialMetrics.totalBalance.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Total Joma - Total Bajar</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200"
          onClick={() => { setView('history'); setHistoryFilter('meals'); }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <User className="w-5 h-5 mr-2 text-violet-500" />
              Total Meals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{financialMetrics.totalMeals}</div>
            <p className="text-xs text-slate-500">All members</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row - 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card 
          className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200"
          onClick={() => { setView('history'); setHistoryFilter('grocery'); }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <ShoppingCart className="w-5 h-5 mr-2 text-violet-500" />
              Total Bajar (Grocery)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">৳{financialMetrics.totalGrocery.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Only grocery expenses</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200"
          onClick={() => { setView('history'); setHistoryFilter('deposits'); }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <Plus className="w-5 h-5 mr-2 text-violet-500" />
              Total Joma
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">৳{financialMetrics.totalDeposits.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Deposits from all members</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-transform duration-200"
          onClick={() => { setView('history'); setHistoryFilter('other'); }}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center text-slate-500">
              <Home className="w-5 h-5 mr-2 text-violet-500" />
              Basa Vara + Others
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">৳{financialMetrics.totalOtherExpenses.toFixed(2)}</div>
            <p className="text-xs text-slate-500">Other expenses only</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Button 
          variant="outline" 
          className="flex flex-col h-auto py-4 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-slate-200 shadow-sm"
          onClick={openMealModal}
        >
          <Plus className="w-6 h-6 mb-2" />
          <span className="font-semibold">Add Meal</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col h-auto py-4 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-slate-200 shadow-sm"
          onClick={openGroceryModal}
        >
          <ShoppingCart className="w-6 h-6 mb-2" />
          <span className="font-semibold">Bajar Khoroch</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col h-auto py-4 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-slate-200 shadow-sm"
          onClick={openDepositModal}
        >
          <Plus className="w-6 h-6 mb-2" />
          <span className="font-semibold">Add Joma</span>
        </Button>
        
        <Button 
          variant="outline" 
          className="flex flex-col h-auto py-4 bg-white text-slate-600 hover:bg-slate-50 hover:text-indigo-600 border-slate-200 shadow-sm"
          onClick={openOtherModal}
        >
          <Wifi className="w-6 h-6 mb-2" />
          <span className="font-semibold">Add Expense</span>
        </Button>
      </div>

      {/* Member List */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead className="text-right">Meals</TableHead>
                <TableHead className="text-right">Joma</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersWithBalances.map((member) => (
                <TableRow 
                  key={member.id} 
                  className="cursor-pointer"
                  onClick={() => viewMemberDetail(member)}
                >
                  <TableCell className="font-medium">
                     <div className="flex items-center">
                      <div className="bg-slate-100 border-2 border-dashed rounded-xl w-10 h-10 mr-4 flex items-center justify-center text-slate-500">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center">
                           <div className="text-slate-800 font-semibold">{member.name}</div>
                          {member.isManager && (
                            <Crown className="w-4 h-4 ml-2 text-amber-500" />
                          )}
                        </div>
                        <div className="text-sm text-slate-500">{member.role}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-slate-600">{member.totalMeals}</TableCell>
                  <TableCell className="text-right text-slate-600">৳{member.totalDeposits.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={member.balance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ৳{member.balance.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  // Render member detail view
  const renderMemberDetail = () => {
    if (!selectedMember) return null;

    // Find the member with extended data
    const memberWithDetails = membersWithBalances.find(m => m.id === selectedMember.id);
    if (!memberWithDetails) return null;

    return (
      <div className="max-w-4xl mx-auto">
        {/* Header with back button */}
        <header className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 pl-0"
            onClick={goBackToDashboard}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">
            {memberWithDetails.name} - Details
            {memberWithDetails.isManager && (
              <Crown className="w-5 h-5 ml-2 inline text-amber-500" />
            )}
          </h1>
        </header>

        <div className="space-y-6">
          {/* Member Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Deposit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">৳{memberWithDetails.totalDeposits}</div>
                <p className="text-xs text-slate-500">From "Add Joma"</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Bajar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">৳{memberWithDetails.totalGroceryExpense}</div>
                <p className="text-xs text-slate-500">From "Bajar Khoroch"</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Total Meals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-800">{memberWithDetails.totalMeals}</div>
                <p className="text-xs text-slate-500">From "Add Meal"</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${memberWithDetails.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ৳{memberWithDetails.balance.toFixed(2)}
                </div>
                <p className="text-xs text-slate-500">Calculated value</p>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="font-medium mb-2 text-slate-700">Meal History</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Meals</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberWithDetails.meals.length > 0 ? (
                      memberWithDetails.meals.map((meal) => (
                        <TableRow key={meal.id}>
                          <TableCell>{meal.date}</TableCell>
                          <TableCell className="text-right">{meal.count}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-500 py-4">
                           No meals recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="font-medium mb-2 text-slate-700">Deposits</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberWithDetails.deposits.length > 0 ? (
                      memberWithDetails.deposits.map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell>{deposit.date}</TableCell>
                          <TableCell className="text-right">৳{deposit.amount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-slate-500 py-4">
                          No deposits recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <h3 className="font-medium mb-2 text-slate-700">Expenses</h3>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberWithDetails.expenses.length > 0 ? (
                      memberWithDetails.expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell>{expense.date}</TableCell>
                          <TableCell>
                              {expense.type === 'grocery' ? 'Grocery' : 'Other'}
                              {expense.description && ` (${expense.description})`}
                          </TableCell>
                          <TableCell className="text-right">৳{expense.amount}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-slate-500 py-4">
                          No expenses recorded
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  // Render history view
  const renderHistory = () => {
    // Combine all transactions
    const allTransactions: Transaction[] = [];

    members.forEach(member => {
      // Add meals
      member.meals.forEach(meal => {
        allTransactions.push({
          id: meal.id,
          date: meal.date,
          type: "Meal",
          memberId: member.id,
          memberName: member.name,
          amount: 0,
          count: meal.count
        });
      });

      // Add deposits
      member.deposits.forEach(deposit => {
        allTransactions.push({
          id: deposit.id,
          date: deposit.date,
          type: "Deposit",
          memberId: member.id,
          memberName: member.name,
          amount: deposit.amount
        });
      });

      // Add expenses
      member.expenses.forEach(expense => {
        allTransactions.push({
          id: expense.id,
          date: expense.date,
          type: expense.type === "grocery" ? "Grocery" : "Other Expense",
          memberId: member.id,
          memberName: member.name,
          amount: expense.amount,
          description: expense.description
        });
      });
    });

    const historyTitles = {
      all: "Transaction History",
      meals: "Meal History",
      grocery: "Grocery (Bajar) History",
      deposits: "Deposit (Joma) History",
      other: "Other Expenses History"
    };

    const filteredTransactions = allTransactions.filter(transaction => {
        if (historyFilter === 'all') return true;
        if (historyFilter === 'meals') return transaction.type === 'Meal';
        if (historyFilter === 'grocery') return transaction.type === 'Grocery';
        if (historyFilter === 'deposits') return transaction.type === 'Deposit';
        if (historyFilter === 'other') return transaction.type === 'Other Expense';
        return false;
    });


    // Sort by date (newest first)
    filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
      <div className="max-w-4xl mx-auto">
        <header className="mb-6">
          <Button 
            variant="ghost" 
            className="mb-4 pl-0"
            onClick={goBackToDashboard}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-800">{historyTitles[historyFilter]}</h1>
        </header>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Member</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.date}</TableCell>
                      <TableCell>{transaction.type}</TableCell>
                      <TableCell>{transaction.memberName}</TableCell>
                      <TableCell>
                        {transaction.type === 'Meal' && `${transaction.count} meals`}
                        {transaction.type === 'Deposit' && `৳${transaction.amount}`}
                        {transaction.type === 'Grocery' && `৳${transaction.amount} ${transaction.description ? `(${transaction.description})` : ''}`}
                        {transaction.type === 'Other Expense' && `৳${transaction.amount} ${transaction.description ? `(${transaction.description})` : ''}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleOpenEditModal(transaction)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-500 py-4">
                      No transactions recorded for this category
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render settings view
  const renderSettings = () => {
    const monthOptions = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      return d.toLocaleString('default', { month: 'long', year: 'numeric' });
    });

    return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-6">
        <Button 
          variant="ghost" 
          className="mb-4 pl-0"
          onClick={goBackToDashboard}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="month-select">Current Month</Label>
                <Select value={settingsMonth} onValueChange={setSettingsMonth}>
                  <SelectTrigger id="month-select">
                    <SelectValue placeholder="Select a month" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Add Member Card */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Member</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex space-x-2">
                <Input
                  placeholder="Member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                />
                <Button onClick={handleAddMember}>Add</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Manage Members Card */}
        <Card>
          <CardHeader>
            <CardTitle>Manage Members</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {settingsMembers.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {editingMemberId === member.id ? (
                        <Input
                          value={editingMemberName}
                          onChange={(e) => setEditingMemberName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditedMember()}
                        />
                      ) : (
                        <div className="flex items-center font-medium text-slate-700">
                          {member.name}
                          {member.isManager && (
                            <Crown className="w-4 h-4 ml-2 text-amber-500" />
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-md">
                        {member.isManager ? "Manager" : member.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {editingMemberId === member.id ? (
                        <Button size="sm" onClick={saveEditedMember}>
                          Save
                        </Button>
                      ) : (
                        <div className="flex justify-end space-x-1">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => startEditingMember(member)}
                            aria-label={`Edit ${member.name}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {!member.isManager && (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => setMemberAsManager(member.id)}
                              aria-label={`Make ${member.name} manager`}
                            >
                              <Crown className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => deleteMember(member.id)}
                             aria-label={`Delete ${member.name}`}
                             className="text-red-500 hover:bg-red-50"
                          >
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex justify-end">
        <Button onClick={handleSaveChanges}>Save Changes</Button>
      </div>
    </div>
  )};

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      {view === "dashboard" && renderDashboard()}
      {view === "member-detail" && renderMemberDetail()}
      {view === "history" && renderHistory()}
      {view === "settings" && renderSettings()}

      {/* Add Meal Modal */}
      {isMealModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Meal</h3>
              <button 
                onClick={() => setIsMealModalOpen(false)} 
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div ref={activeCalendar === 'meal' ? calendarWrapperRef : null}>
                <Label htmlFor="meal-date" className="block mb-2">Date</Label>
                <div className="relative">
                  <button onClick={() => toggleCalendar('meal')} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500">
                    <span>{formatDateForDisplay(mealForm.date)}</span>
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </button>
                  {activeCalendar === 'meal' && (
                    <div className="absolute top-full mt-2 z-10">
                      <CustomCalendar
                        value={mealForm.date}
                        onChange={(date) => handleDateChange('meal', date)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                {members.map(member => (
                  <div key={member.id} className="flex justify-between items-center py-3 border-b border-slate-100 last:border-b-0">
                    <span className="font-medium text-slate-700">{member.name}</span>
                    <div className="flex items-center space-x-3">
                      <Button 
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-full"
                        onClick={() => updateMealCount(member.id, -1)}
                      >
                        -
                      </Button>
                      <span className="text-lg font-semibold text-slate-800 w-8 text-center">
                        {mealForm.counts[member.id] || 0}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-8 h-8 p-0 rounded-full"
                        onClick={() => updateMealCount(member.id, 1)}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <Button className="w-full mt-6" onClick={handleAddMeal}>Add Meal</Button>
          </div>
        </div>
      )}

      {/* Add Grocery Expense Modal */}
      {isGroceryModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Bajar Khoroch</h3>
              <button 
                onClick={() => setIsGroceryModalOpen(false)} 
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div ref={activeCalendar === 'grocery' ? calendarWrapperRef : null}>
                <Label htmlFor="grocery-date" className="block mb-2">Date</Label>
                <div className="relative">
                  <button onClick={() => toggleCalendar('grocery')} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500">
                    <span>{formatDateForDisplay(expenseForm.date)}</span>
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </button>
                  {activeCalendar === 'grocery' && (
                    <div className="absolute top-full mt-2 z-10">
                      <CustomCalendar
                        value={expenseForm.date}
                        onChange={(date) => handleDateChange('grocery', date)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Paid By</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <Button 
                      key={member.id}
                      variant={expenseForm.memberId === member.id ? 'default' : 'outline'}
                      onClick={() => setExpenseForm({...expenseForm, memberId: member.id})}
                    >
                      {member.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="grocery-amount" className="block mb-2">Amount (৳)</Label>
                <Input 
                  id="grocery-amount" 
                  type="number" 
                  min="0"
                  value={expenseForm.amount === 0 ? "" : expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="grocery-description" className="block mb-2">Description (Optional)</Label>
                <Input 
                  id="grocery-description" 
                  value={expenseForm.description} 
                  onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                  placeholder="e.g. Weekly grocery"
                />
              </div>
              <Button className="w-full pt-4" onClick={handleAddGrocery}>Add Grocery Expense</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Deposit Modal */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Deposit</h3>
              <button 
                onClick={() => setIsDepositModalOpen(false)} 
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              <div ref={activeCalendar === 'deposit' ? calendarWrapperRef : null}>
                <Label htmlFor="deposit-date" className="block mb-2">Date</Label>
                <div className="relative">
                   <button onClick={() => toggleCalendar('deposit')} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500">
                    <span>{formatDateForDisplay(depositForm.date)}</span>
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </button>
                  {activeCalendar === 'deposit' && (
                    <div className="absolute top-full mt-2 z-10">
                      <CustomCalendar
                        value={depositForm.date}
                        onChange={(date) => handleDateChange('deposit', date)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">From</Label>
                 <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <Button 
                      key={member.id}
                      variant={depositForm.memberId === member.id ? 'default' : 'outline'}
                      onClick={() => setDepositForm({...depositForm, memberId: member.id})}
                    >
                      {member.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="deposit-amount" className="block mb-2">Amount (৳)</Label>
                <Input 
                  id="deposit-amount" 
                  type="number" 
                  min="0"
                  value={depositForm.amount === 0 ? "" : depositForm.amount}
                  onChange={(e) => setDepositForm({...depositForm, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <Button className="w-full pt-4" onClick={handleAddDeposit}>Add Deposit</Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Other Expense Modal */}
      {isOtherModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Add Other Expense</h3>
              <button 
                onClick={() => setIsOtherModalOpen(false)} 
                className="text-slate-500 hover:text-slate-800"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
               <div ref={activeCalendar === 'other' ? calendarWrapperRef : null}>
                <Label htmlFor="other-date" className="block mb-2">Date</Label>
                <div className="relative">
                  <button onClick={() => toggleCalendar('other')} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500">
                    <span>{formatDateForDisplay(otherExpenseForm.date)}</span>
                    <Calendar className="w-5 h-5 text-slate-400" />
                  </button>
                  {activeCalendar === 'other' && (
                    <div className="absolute top-full mt-2 z-10">
                      <CustomCalendar
                        value={otherExpenseForm.date}
                        onChange={(date) => handleDateChange('other', date)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div>
                 <Label className="mb-2 block">Paid By</Label>
                 <div className="flex flex-wrap gap-2">
                  {members.map(member => (
                    <Button 
                      key={member.id}
                      variant={otherExpenseForm.memberId === member.id ? 'default' : 'outline'}
                      onClick={() => setOtherExpenseForm({...otherExpenseForm, memberId: member.id})}
                    >
                      {member.name}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="other-amount" className="block mb-2">Amount (৳)</Label>
                <Input 
                  id="other-amount" 
                  type="number" 
                  min="0"
                  value={otherExpenseForm.amount === 0 ? "" : otherExpenseForm.amount}
                  onChange={(e) => setOtherExpenseForm({...otherExpenseForm, amount: parseFloat(e.target.value) || 0})}
                   placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="other-description" className="block mb-2">Description</Label>
                <Input 
                  id="other-description" 
                  value={otherExpenseForm.description} 
                  onChange={(e) => setOtherExpenseForm({...otherExpenseForm, description: e.target.value})}
                  placeholder="e.g. Internet bill, rent"
                />
              </div>
              <Button className="w-full pt-4" onClick={handleAddOtherExpense}>Add Expense</Button>
            </div>
          </div>
        </div>
      )}

       {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800">Edit {editingTransaction.type}</h3>
                    <button 
                        onClick={() => setIsEditModalOpen(false)} 
                        className="text-slate-500 hover:text-slate-800"
                        aria-label="Close modal"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="space-y-4">
                    <div ref={activeCalendar === 'edit' ? calendarWrapperRef : null}>
                        <Label htmlFor="edit-date" className="block mb-2">Date</Label>
                         <div className="relative">
                          <button onClick={() => toggleCalendar('edit')} className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white py-2 px-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-indigo-500">
                            <span>{formatDateForDisplay(editFormState.date)}</span>
                            <Calendar className="w-5 h-5 text-slate-400" />
                          </button>
                          {activeCalendar === 'edit' && (
                            <div className="absolute top-full mt-2 z-10">
                              <CustomCalendar
                                value={editFormState.date}
                                onChange={(date) => handleDateChange('edit', date)}
                              />
                            </div>
                          )}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="edit-member" className="block mb-2">Member</Label>
                        <Select 
                            value={editFormState.memberId} 
                            onValueChange={(value) => setEditFormState({...editFormState, memberId: value})}
                        >
                            <SelectTrigger id="edit-member">
                                <SelectValue placeholder="Select a member" />
                            </SelectTrigger>
                            <SelectContent>
                                {members.map(member => (
                                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {editingTransaction.type === 'Meal' && (
                        <div>
                            <Label htmlFor="edit-count" className="block mb-2">Meal Count</Label>
                            <Input 
                                id="edit-count" 
                                type="number"
                                min="0"
                                value={editFormState.count === 0 ? '' : editFormState.count}
                                onChange={(e) => setEditFormState({...editFormState, count: parseInt(e.target.value, 10) || 0})}
                                placeholder="0"
                            />
                        </div>
                    )}
                    {['Deposit', 'Grocery', 'Other Expense'].includes(editingTransaction.type) && (
                        <div>
                            <Label htmlFor="edit-amount" className="block mb-2">Amount (৳)</Label>
                            <Input 
                                id="edit-amount" 
                                type="number" 
                                min="0"
                                value={editFormState.amount === 0 ? '' : editFormState.amount}
                                onChange={(e) => setEditFormState({...editFormState, amount: parseFloat(e.target.value) || 0})}
                                placeholder="0.00"
                            />
                        </div>
                    )}
                    {['Grocery', 'Other Expense'].includes(editingTransaction.type) && (
                        <div>
                            <Label htmlFor="edit-description" className="block mb-2">Description</Label>
                            <Input 
                                id="edit-description" 
                                value={editFormState.description} 
                                onChange={(e) => setEditFormState({...editFormState, description: e.target.value})}
                                placeholder="Description"
                            />
                        </div>
                    )}
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateTransaction}>Save Changes</Button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}