import torch
import xn
from xntorch.autograd import Variable
import sys
import os
sys.path.append(os.path.join(sys.path[0], '..', 'test'))
from stack_lstm import StackLSTM, PseudoLogLSTM
from vgg import vgg16

myInt = 86
myInt2 = 87
myFloat = 3.1415926535897
xn.view(myFloat)
myBool = True
myString = "The quick brown fox jumps over the lazy dog"
myNone = None

myList = [1, 2.3, False, "hello", None, [10, 11, ["This", "is", "the", "end"]]]
xn.view(myList)
myList[0] = 100
myDict = {"key1": "value1", "key2": "value2", 10: myList}
myTensor1 = torch.rand(2, 3, 4, 5)
myTensor2 = myTensor1[0, 0]
myTensor3 = myTensor1[0, 0, 0]
myFloat2 = myTensor1[0, 0, 0, 0]
xn.view(myTensor1)

myClass = Variable
myVGGInput = Variable(torch.ones(1, 3, 32, 32))
myVGG = vgg16()
myVGGOutput = myVGG(myVGGInput)

myRNNBatchSize = 5
myRNNDims = [10, 10, 10, 10]
myRNNInput = [Variable(torch.ones(5, myRNNDims[0])) for _ in range(4)]
myRNN = StackLSTM(myRNNBatchSize, myRNNDims)
myRNNOutput = myRNN(myRNNInput)

myPseudoLogLSTM = PseudoLogLSTM(myRNNBatchSize, myRNNDims)
myPseudoLogLSTMOutput = myPseudoLogLSTM(myRNNInput)

def myFn(arg1, arg2=2):
    f = [1,2,3,4,5]
    q = [f,3,4,5,2]
    q[1] = 5
    q = q
    return q

myFnRef = myFn
myFnOutput = myFn(0, 1)
