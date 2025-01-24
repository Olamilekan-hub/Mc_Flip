"use client"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card"

export default function SubscriptionManagement() {
  return (
    <div className="p-6 space-y-6 bg-background text-foreground dark">
      <h1 className="text-2xl font-bold">Subscription Management</h1>
      
      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Active Subscription</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>Your subscription is currently active.</p>
          <p>Expires: 12/4/2024 3:03:58 PM</p>
          
          <div className="space-y-1">
            <p>Time Remaining:</p>
            <p className="pl-4">30 days</p>
            <p className="pl-4">1 hours</p>
            <p className="pl-4">58 minutes</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-muted">
        <CardHeader>
          <CardTitle>Activate Subscription</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-4">
          <Input 
            placeholder="Enter your subscription code" 
            className="flex-grow"
          />
          <Button variant="secondary">
            Activate
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

