'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DraggableWindow from '@/components/ui/draggable-window';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Target, Eye, Sliders } from 'lucide-react';
import { DEFAULT_CONFIG, PRESETS } from '@/lib/constants';
import { AppConfig } from '@/lib/types';

export default function ConfigWindow() {
  const socket = useSocket();
  const [open, setOpen] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);

  const updateDetectionConfig = (updates: Partial<typeof config.detection>) => {
    const newConfig = { ...config, detection: { ...config.detection, ...updates } };
    setConfig(newConfig);
    socket.updateConfig('detection', newConfig.detection);
  };

  const updateVisualConfig = (updates: Partial<typeof config.visual>) => {
    const newConfig = { ...config, visual: { ...config.visual, ...updates } };
    setConfig(newConfig);
    socket.updateConfig('visual', newConfig.visual);
  };

  const updateAdvancedConfig = (updates: Partial<typeof config.advanced>) => {
    const newConfig = { ...config, advanced: { ...config.advanced, ...updates } };
    setConfig(newConfig);
    socket.updateConfig('advanced', newConfig.advanced);
  };

  const applyPreset = (preset: string) => {
    if (preset in PRESETS) {
      const presetConfig = PRESETS[preset as keyof typeof PRESETS];
      updateDetectionConfig(presetConfig.detection);
      updateVisualConfig(presetConfig.visual);
      socket.applyPreset(preset);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        className="flex items-center gap-2"
        onClick={() => setOpen(true)}
      >
        <Settings className="h-4 w-4" />
        Configuration
      </Button>
      
      <DraggableWindow
        title="System Configuration"
        icon={<Settings className="h-5 w-5" />}
        isOpen={open}
        onClose={() => setOpen(false)}
        defaultPosition={{ x: 50, y: 50 }}
        defaultSize={{ width: '700px', height: '600px' }}
        minWidth="500px"
        minHeight="400px"
      >

        <Tabs defaultValue="detection" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="detection" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Detection
            </TabsTrigger>
            <TabsTrigger value="visual" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visual
            </TabsTrigger>
            <TabsTrigger value="advanced" className="flex items-center gap-2">
              <Sliders className="h-4 w-4" />
              Advanced
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detection" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Counting Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">Zone Start Position: {config.detection.zoneStart}%</Label>
                  <Slider
                    value={[config.detection.zoneStart]}
                    onValueChange={([value]) => updateDetectionConfig({ zoneStart: value })}
                    max={90}
                    min={0}
                    step={1}
                    className="mt-2"
                  />
                </div>
                
                <div>
                  <Label className="text-sm">Zone Width: {config.detection.zoneWidth}%</Label>
                  <Slider
                    value={[config.detection.zoneWidth]}
                    onValueChange={([value]) => updateDetectionConfig({ zoneWidth: value })}
                    max={50}
                    min={5}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Show Counting Zone</Label>
                  <Switch
                    checked={config.detection.showZone}
                    onCheckedChange={(checked) => updateDetectionConfig({ showZone: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detection Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">
                    Detection Threshold: {Math.round(config.detection.threshold * 100)}%
                  </Label>
                  <Slider
                    value={[config.detection.threshold]}
                    onValueChange={([value]) => updateDetectionConfig({ threshold: value })}
                    max={1}
                    min={0.1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Auto Counting</Label>
                  <Switch
                    checked={config.detection.autoCount}
                    onCheckedChange={(checked) => updateDetectionConfig({ autoCount: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="visual" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Display Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Show Bounding Boxes</Label>
                  <Switch
                    checked={config.visual.showBoxes}
                    onCheckedChange={(checked) => updateVisualConfig({ showBoxes: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Show Product Labels</Label>
                  <Switch
                    checked={config.visual.showLabels}
                    onCheckedChange={(checked) => updateVisualConfig({ showLabels: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Show Confidence Score</Label>
                  <Switch
                    checked={config.visual.showConfidence}
                    onCheckedChange={(checked) => updateVisualConfig({ showConfidence: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Colors & Appearance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm">
                    Zone Opacity: {Math.round(config.visual.zoneOpacity * 100)}%
                  </Label>
                  <Slider
                    value={[config.visual.zoneOpacity]}
                    onValueChange={([value]) => updateVisualConfig({ zoneOpacity: value })}
                    max={1}
                    min={0.1}
                    step={0.1}
                    className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Performance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Resolution</Label>
                  <Select
                    value={config.advanced.resolution}
                    onValueChange={(value) => updateAdvancedConfig({ resolution: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="640x480">640 x 480</SelectItem>
                      <SelectItem value="1280x720">1280 x 720 (HD)</SelectItem>
                      <SelectItem value="1920x1080">1920 x 1080 (Full HD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Frame Rate: {config.advanced.frameRate} FPS</Label>
                  <Slider
                    value={[config.advanced.frameRate]}
                    onValueChange={([value]) => updateAdvancedConfig({ frameRate: value })}
                    max={60}
                    min={10}
                    step={1}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Processing Speed</Label>
                  <Select
                    value={config.advanced.processingSpeed}
                    onValueChange={(value) => updateAdvancedConfig({ processingSpeed: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fast">Fast (Lower Quality)</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="accurate">Accurate (Slower)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Presets</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => applyPreset('retail')}>
                    Retail
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset('demo')}>
                    Demo
                  </Button>
                  <Button variant="outline" onClick={() => applyPreset('debug')}>
                    Debug
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DraggableWindow>
    </>
  );
}