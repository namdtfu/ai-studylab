# -*- coding: utf-8 -*-
import json
from pathlib import Path

def question(i, text, opts, correct, explanation):
    return dict(id=f'q{i}', category='theory' if i<=5 else 'application',questionText=text,options=dict(zip('ABCD',opts)),correctOption=correct,explanation=explanation)
physics=dict(schemaVersion='1.0',subject='대학물리학2',chapter='전기장',title='쿨롱의 법칙',language='ko',academicLevel='대학교',
learningObjectives=['두 점전하 사이 전기력의 크기와 방향을 구한다.','벡터 중첩 원리를 이용해 여러 전하의 합력을 구한다.','거리, 전하량과 유전율 변화가 전기력에 미치는 영향을 설명한다.'],
theorySections=[
 dict(heading='전하와 전기력',content=r'전하는 양전하와 음전하로 구분한다. 같은 부호의 전하는 서로 밀어내고, 다른 부호의 전하는 서로 끌어당긴다. 전하량의 SI 단위는 쿨롱(C)이다. **점전하**는 관찰 거리와 비교해 크기를 무시할 수 있는 전하 분포의 이상화이다.'),
 dict(heading='쿨롱의 법칙',content=r'진공에서 정지한 두 점전하 사이 힘의 크기는 $$F=k\frac{|q_1q_2|}{r^2}$$ 이다. 여기서 $k=1/(4\pi\varepsilon_0)\approx 9.0\times10^9\ \mathrm{N\,m^2/C^2}$, $r$은 두 전하 사이 거리이다. 힘의 방향은 두 전하를 연결하는 직선 위에 있다. 두 전하가 서로에게 주는 힘은 크기가 같고 방향이 반대이다.',example=r'$r$이 2배가 되면 분모는 4배이므로 힘은 원래의 $1/4$이다.'),
 dict(heading='벡터와 중첩 원리',content=r'여러 전하가 있을 때 한 전하가 받는 합력은 각각의 전하가 만드는 힘의 **벡터합**이다. $$\vec F_{\mathrm{net}}=\sum_i \vec F_i$$ 1차원에서는 기준 방향을 정하고 힘에 부호를 붙인다. 2차원에서는 $x,y$ 성분을 각각 더한다.'),
 dict(heading='매질과 적용 범위',content=r'이상적인 균일·등방성 선형 유전체에서는 유전율을 $\varepsilon=\varepsilon_r\varepsilon_0$로 놓아 $F=|q_1q_2|/(4\pi\varepsilon r^2)$로 계산한다. 경계면, 분극이 복잡한 경우나 움직이는 전하에는 추가적인 분석이 필요하다. 이 단원의 계산 문제는 진공의 정지 점전하를 가정한다.')],
workedExamples=[dict(title='두 양전하 사이의 반발력',problem=r'$q_1=2\,\mu C$, $q_2=3\,\mu C$, $r=0.30\,m$이다. 힘을 구하라.',solution=r'$\mu C=10^{-6}C$이므로 $$F=9.0\times10^9\frac{(2\times10^{-6})(3\times10^{-6})}{0.30^2}=0.60\,N.$$ 두 전하가 모두 양수이므로 반발력이다.'),dict(title='대칭 배치의 합력',problem='원점의 양전하 양쪽에 크기가 같은 양전하를 같은 거리로 배치했다. 원점 전하의 합력은?',solution='왼쪽 전하는 오른쪽으로, 오른쪽 전하는 왼쪽으로 같은 크기의 힘을 준다. 벡터합은 0이다.')],
commonMistakes=[r'거리 단위를 cm에서 m로 바꾸지 않는 실수. $10\,cm=0.10\,m$이다.',r'음전하가 포함된 경우 힘의 크기에 음수를 쓰는 실수. 크기는 양수이며 방향을 별도로 판단한다.',r'서로 반대 방향인 힘의 크기를 단순히 더하는 실수. 힘은 벡터이다.'],
summary=r'전기력은 전하량의 곱에 비례하고 거리의 제곱에 반비례한다. 같은 부호는 반발하고 다른 부호는 인력이다. SI 단위를 사용하고 여러 힘은 벡터로 합한다.',questions=[
question(1,'진공에서 같은 부호의 두 점전하는 어떻게 상호작용하는가?',['서로 밀어낸다.','서로 끌어당긴다.','항상 힘이 없다.','항상 회전력만 작용한다.'],'A','같은 부호 전하 사이에는 두 전하를 연결하는 직선 방향의 반발력이 작용한다.'),
question(2,'전하량이 일정할 때 쿨롱 힘의 크기는 거리 r에 어떻게 의존하는가?',[r'$r$',r'$r^2$',r'$1/r$',r'$1/r^2$'],'D',r'$F=k|q_1q_2|/r^2$이므로 거리 제곱에 반비례한다.'),
question(3,'전하량의 SI 단위는 무엇인가?',['뉴턴(N)','쿨롱(C)','볼트(V)','줄(J)'],'B','전하량의 단위는 쿨롱(C)이다. 뉴턴은 힘, 볼트는 전위차, 줄은 에너지의 단위이다.'),
question(4,'여러 점전하가 주는 전기력의 합력을 계산하는 올바른 방법은?',['가장 가까운 전하의 힘만 사용한다.','모든 힘의 크기만 더한다.','각 전기력을 벡터로 더한다.','항상 전하 개수로 나눈다.'],'C','중첩 원리에 따라 각 전하가 독립적으로 주는 힘을 벡터합한다. 방향을 무시하면 올바른 합력을 구할 수 없다.'),
question(5,'두 점전하가 서로에게 주는 힘의 관계로 옳은 것은?',['큰 전하가 받는 힘이 더 크다.','작은 전하가 받는 힘이 더 크다.','크기와 방향이 모두 같다.','크기는 같고 방향은 반대이다.'],'D','두 힘은 작용·반작용 쌍이다. 전하량이 달라도 두 힘의 크기는 같고 방향은 반대이다.'),
question(6,r'$q_1=2\,\mu C$, $q_2=3\,\mu C$, $r=0.30\,m$, $k=9.0\times10^9$일 때 힘의 크기는?',['0.06 N','0.60 N','6.0 N','60 N'],'B',r'$F=9.0\times10^9(2\times10^{-6})(3\times10^{-6})/0.09=0.60\,N$이다.'),
question(7,'전하량은 그대로 두고 거리를 3배로 늘렸다. 힘의 크기는 원래의 몇 배인가?',['3배','1/3배','1/9배','9배'],'C',r'$F\propto1/r^2$이므로 $F_{new}/F_{old}=1/3^2=1/9$이다.'),
question(8,'두 전하량을 각각 2배, 거리를 2배로 바꾸면 힘의 크기는?',['원래와 같다.','원래의 2배이다.','원래의 4배이다.','원래의 1/4이다.'],'A',r'전하량 곱은 4배이고 거리 제곱도 4배이다. 비율은 $4/4=1$이므로 힘은 같다.'),
question(9,r'$+q$를 원점에, 같은 크기의 양전하 $+Q$를 $x=-a$와 $x=+a$에 놓았다. 원점 전하의 합력은?',['오른쪽 방향이다.','왼쪽 방향이다.','위쪽 방향이다.','0이다.'],'D','왼쪽 전하로 인한 오른쪽 힘과 오른쪽 전하로 인한 왼쪽 힘은 크기가 같다. 서로 상쇄되어 합력은 0이다.'),
question(10,r'원점의 $+1\,\mu C$와 $x=0.10\,m$의 $-1\,\mu C$ 사이 힘에서, 원점 전하가 받는 힘은? ($k=9.0\times10^9$)',['왼쪽으로 0.90 N','오른쪽으로 0.09 N','오른쪽으로 0.90 N','왼쪽으로 0.09 N'],'C',r'크기는 $9.0\times10^9\times10^{-12}/0.10^2=0.90\,N$이다. 다른 부호이므로 인력이며 원점 전하는 오른쪽의 음전하 쪽으로 끌린다.')])
calculus=dict(schemaVersion='1.0',subject='미적분학',chapter='편미분',title='편도함수',language='ko',academicLevel='대학교',
learningObjectives=['다변수 함수에서 편도함수를 극한으로 정의한다.','다른 변수를 상수로 두어 편미분을 계산한다.','이계 편도함수와 혼합 편도함수를 구분하고 계산한다.'],
theorySections=[dict(heading='편도함수의 정의',content=r'함수 $f(x,y)$에서 $y$를 고정한 채 $x$에 대한 변화율을 구한 것이 $x$에 관한 편도함수이다. $$f_x(a,b)=\lim_{h\to0}\frac{f(a+h,b)-f(a,b)}{h}$$ 이 극한이 존재할 때 정의된다. $f_y$는 $x$를 고정하고 $y$를 변화시킨다.'),dict(heading='계산 방법',content=r'$x$에 대해 미분할 때 $y$는 상수로 취급한다. 예를 들어 $f(x,y)=x^2y+3y$이면 $$f_x=2xy,\qquad f_y=x^2+3.$$ 곱의 법칙, 연쇄 법칙 등 일변수 미분 규칙을 적용한다.'),dict(heading='기하학적 의미',content=r'$z=f(x,y)$의 $f_x(a,b)$는 평면 $y=b$로 자른 곡선의 해당 점에서의 접선 기울기이다. $f_y(a,b)$는 평면 $x=a$로 자른 곡선의 기울기이다. 편도함수의 존재만으로 다변수 함수의 미분가능성이 보장되지는 않는다.'),dict(heading='이계 및 혼합 편도함수',content=r'이 문서에서는 $f_{xy}=\partial(f_x)/\partial y$로 정의한다. 즉 $x$에 대해 먼저, $y$에 대해 다음으로 미분한다. $f_{xx}$는 $x$로 두 번 미분한 것이다. 혼합 편도함수가 근방에서 연속이면 $f_{xy}=f_{yx}$이다.')],
workedExamples=[dict(title='다항함수의 편미분',problem=r'$f(x,y)=x^3y+2xy^2$의 $f_x,f_y$를 구하라.',solution=r'$y$를 고정하면 $f_x=3x^2y+2y^2$이다. $x$를 고정하면 $f_y=x^3+4xy$이다.'),dict(title='한 점에서의 변화율',problem=r'$f(x,y)=x^2+xy$에 대하여 $f_x(1,2)$를 구하라.',solution=r'$f_x=2x+y$이다. 따라서 $f_x(1,2)=2+2=4$이다.')],
commonMistakes=[r'$x$로 미분할 때 $y$까지 미분하는 실수. 다른 독립변수는 고정한다.',r'$f_x(a,b)$를 구하기 전에 모든 변수에 점을 대입해 상수로 만드는 실수. 먼저 편도함수를 구하고 대입한다.',r'아무 조건 없이 항상 $f_{xy}=f_{yx}$라고 주장하는 실수. 연속성 등 정리의 가정을 확인한다.'],summary=r'편미분은 다른 독립변수를 고정한 변화율이다. 미분한 다음 점을 대입하고, 혼합 편도함수의 표기 순서와 연속성 조건을 확인한다.',questions=[
question(1,r'$f_x(x,y)$를 계산할 때 독립변수 $y$는 어떻게 취급하는가?',['상수로 고정한다.','항상 0으로 놓는다.','항상 x와 같다고 놓는다.','x로 미분한다.'],'A','편미분은 다른 독립변수를 고정해 한 변수의 변화만 관찰한다. y를 상수로 취급하는 것과 y=0으로 두는 것은 다르다.'),
question(2,r'$f_x(a,b)$를 정의하는 극한은?',[r'$\lim_{h\to0}[f(a,b+h)-f(a,b)]/h$',r'$\lim_{h\to0}[f(a+h,b)-f(a,b)]/h$',r'$f(a,b)/a$',r'$f(a,b)/b$'],'B','x만 a에서 a+h로 변화시키고 y=b를 고정한 차분비의 극한이 x에 대한 편도함수이다.'),
question(3,r'이 문서의 표기에서 $f_{xy}$는 무엇인가?',[r'$f_y$를 $y$로 미분',r'$f_x$를 $x$로 미분',r'$f_x$를 $y$로 미분',r'$f_x$와 $f_y$의 곱'],'C','첫 번째 첨자 x로 미분하여 f_x를 구한 뒤 두 번째 첨자 y로 미분한다.'),
question(4,r'근방에서 $f_{xy}$와 $f_{yx}$가 연속일 때 성립하는 것은?',[r'$f_{xy}=0$',r'$f_x=f_y$',r'$f_{xx}=f_{yy}$',r'$f_{xy}=f_{yx}$'],'D','혼합 편도함수가 근방에서 연속이면 미분 순서를 바꿀 수 있다. 순수 이계 미분이 같거나 0이라는 결론은 나오지 않는다.'),
question(5,r'$f_x(a,b)$의 기하학적 의미로 옳은 것은?',[r'평면 $y=b$로 자른 곡선의 접선 기울기',r'항상 곡면 전체의 면적',r'평면 $x=a$로 자른 곡선의 접선 기울기',r'함수의 최대값'],'A','y=b를 고정한 단면에서 x가 변할 때의 z 변화율이므로 해당 곡선의 접선 기울기이다.'),
question(6,r'$f(x,y)=x^2y+3y$의 $f_x$는?',[r'$x^2+3$',r'$2xy+3$',r'$2xy$',r'$2x$'],'C',r'y를 상수로 두면 $\partial(x^2y)/\partial x=2xy$이고 $\partial(3y)/\partial x=0$이다.'),
question(7,r'$f(x,y)=x^2y+3y$의 $f_y(2,1)$은?',['4','7','5','8'],'B',r'$f_y=x^2+3$이므로 $(2,1)$에서 $4+3=7$이다.'),
question(8,r'$f(x,y)=x^2+xy$의 $f_x(1,2)$는?',['2','3','5','4'],'D',r'$f_x=2x+y$이므로 $f_x(1,2)=2+2=4$이다.'),
question(9,r'$f(x,y)=x^3y^2$의 $f_{xy}$는?',[r'$6x^2y$',r'$3x^2y^2$',r'$2x^3y$',r'$6xy^2$'],'A',r'$f_x=3x^2y^2$를 y로 미분하면 $f_{xy}=6x^2y$이다.'),
question(10,r'$f(x,y)=e^{xy}$의 $f_x$는?',[r'$xe^{xy}$',r'$ye^{xy}$',r'$e^{xy}$',r'$xye^{xy}$'],'B',r'연쇄 법칙에 따라 $\partial e^{xy}/\partial x=e^{xy}\cdot\partial(xy)/\partial x=ye^{xy}$이다.')])
for name,content in [('coulomb',physics),('partial-derivatives',calculus)]:
    data=json.dumps(content,ensure_ascii=False,indent=2)+'\n'
    Path(f'examples/{name}.json').write_text(data,encoding='utf-8')
    Path('public/examples').mkdir(exist_ok=True)
    Path(f'public/examples/{name}.json').write_text(data,encoding='utf-8')
