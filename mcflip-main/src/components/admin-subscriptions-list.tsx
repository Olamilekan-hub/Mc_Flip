'use client'

import { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table"
import { ScrollArea } from "~/components/ui/scroll-area"
import { Button } from "~/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "~/components/ui/dialog"
import { Input } from "~/components/ui/input"
import { Label } from "~/components/ui/label"
import { formatDate } from '~/lib/formatDate'

type Subscription = {
  id: string
  username: string
  expiryDate: Date
  key: string
}

const mockSubscriptions: Subscription[] = [
  { id: '1', username: 'john_doe', expiryDate: new Date('2023-12-31'), key: 'abcd1234efgh5678' },
  { id: '2', username: 'jane_smith', expiryDate: new Date('2024-06-30'), key: 'ijkl9012mnop3456' },
  { id: '3', username: 'bob_johnson', expiryDate: new Date('2023-09-15'), key: 'qrst7890uvwx1234' },
]

export function SubscriptionsList() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(mockSubscriptions)
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [isEditExpiryOpen, setIsEditExpiryOpen] = useState(false)
  const [isChangeUserOpen, setIsChangeUserOpen] = useState(false)
  const [newExpiryDate, setNewExpiryDate] = useState('')
  const [newUsername, setNewUsername] = useState('')

  const handleCopyKey = (key: string) => {
    void navigator.clipboard.writeText(key)
  }

  const handleDeactivate = () => {
    if (selectedSubscription) {
      // Implement deactivation logic here
      console.log('Deactivate subscription:', selectedSubscription.id)
      setIsDeactivateOpen(false)
    }
  }

  const handleEditExpiry = () => {
    if (selectedSubscription && newExpiryDate) {
      // Implement edit expiry logic here
      console.log('Edit expiry for subscription:', selectedSubscription.id, 'New date:', newExpiryDate)
      setIsEditExpiryOpen(false)
      setNewExpiryDate('')
    }
  }

  const handleChangeUser = () => {
    if (selectedSubscription && newUsername) {
      // Implement change user logic here
      console.log('Change user for subscription:', selectedSubscription.id, 'New username:', newUsername)
      setIsChangeUserOpen(false)
      setNewUsername('')
    }
  }

  return (
    <div className="rounded-md border">
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.map((subscription) => (
              <TableRow key={subscription.id}>
                <TableCell>{subscription.username}</TableCell>
                <TableCell>{formatDate(subscription.expiryDate)}</TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCopyKey(subscription.key)}
                          className="font-mono text-sm hover:underline"
                        >
                          {subscription.key.slice(0, 8)}...
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Key copied!</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Dialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setSelectedSubscription(subscription)}
                        >
                          Deactivate
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Confirm Deactivation</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to deactivate this subscription?
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsDeactivateOpen(false)}>Cancel</Button>
                          <Button variant="destructive" onClick={handleDeactivate}>Deactivate</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isEditExpiryOpen} onOpenChange={setIsEditExpiryOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubscription(subscription)}
                        >
                          Edit Expiry
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit Expiry Date</DialogTitle>
                          <DialogDescription>
                            Enter the new expiry date for this subscription.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="expiry" className="text-right">
                              New Expiry Date
                            </Label>
                            <Input
                              id="expiry"
                              type="date"
                              value={newExpiryDate}
                              onChange={(e) => setNewExpiryDate(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsEditExpiryOpen(false)}>Cancel</Button>
                          <Button onClick={handleEditExpiry}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog open={isChangeUserOpen} onOpenChange={setIsChangeUserOpen}>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedSubscription(subscription)}
                        >
                          Change User
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Change User</DialogTitle>
                          <DialogDescription>
                            Enter the new username for this subscription.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="username" className="text-right">
                              New Username
                            </Label>
                            <Input
                              id="username"
                              value={newUsername}
                              onChange={(e) => setNewUsername(e.target.value)}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsChangeUserOpen(false)}>Cancel</Button>
                          <Button onClick={handleChangeUser}>Save Changes</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  )
}

