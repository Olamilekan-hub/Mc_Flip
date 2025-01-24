import { TooltipProvider } from "~/components/ui/tooltip"
import { SubscriptionsList } from '~/components/admin-subscriptions-list'

export default function AdminSubscriptionsPage() {
  return (
    <TooltipProvider>
      <div className="container mx-auto py-10">
        <h1 className="text-2xl font-bold mb-5">Subscriptions List</h1>
        <SubscriptionsList />
      </div>
    </TooltipProvider>
  )
}

